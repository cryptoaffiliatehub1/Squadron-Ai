import fs from "fs";
import path from "path";
import OpenAI from "openai";
import nodemailer from "nodemailer";
import { logger } from "./logger";
import { generateDailyReport, readDailyReport, saveFailedReport, readWeightsHistory } from "./paperTrading";
import { isPaperMode, getCurrentMode } from "./tradingMode";
import { getRegime } from "./marketRegime";
import { getMoonbags, getTotalMoonbagValueSol } from "./moonbagVault";
import { getWeights } from "./feedbackLoop";
import { getSessionStats, saveDailySnapshot, getDailySnapshots, getMonthSnapshots } from "./sessionStats";
import { getCircuitState } from "./circuitBreaker";
import cron from "node-cron";

// C1: fallback to SMTP_USER so reports reach the configured mailbox — never a hardcoded address
const REPORT_EMAIL = process.env["REPORT_EMAIL"] ?? process.env["SMTP_USER"] ?? "";
const WHATSAPP_1 = process.env["WHATSAPP_NUMBER_1"] ?? "+2349078886030";
const WHATSAPP_2 = process.env["WHATSAPP_NUMBER_2"] ?? "+2347026125080";
const DATA_DIR = path.resolve(process.cwd(), "data");
const NOTIFICATION_ERRORS_FILE = path.join(DATA_DIR, "notification_errors.json");
const FAILED_REPORTS_DIR = path.join(DATA_DIR, "failed_reports");

function modeLabel(): string {
  return isPaperMode() ? "SIMULATION REPORT" : "LIVE TRADING REPORT";
}
function modeBanner(): string {
  return isPaperMode()
    ? "⚠️  SIMULATION MODE — NO REAL MONEY TRADED"
    : "🟢 LIVE TRADING MODE — Real SOL execution active";
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function logNotificationError(type: string, subject: string, err: unknown): void {
  try {
    ensureDataDir();
    const errors: unknown[] = fs.existsSync(NOTIFICATION_ERRORS_FILE)
      ? JSON.parse(fs.readFileSync(NOTIFICATION_ERRORS_FILE, "utf-8"))
      : [];
    errors.push({ type, subject, error: String(err), at: new Date().toISOString() });
    fs.writeFileSync(NOTIFICATION_ERRORS_FILE, JSON.stringify(errors.slice(-100), null, 2));
  } catch { /* never crash on error logging */ }
}

// ── Email / WhatsApp delivery ────────────────────────────────────────────────

function getMailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] },
  });
}

async function sendEmail(subject: string, body: string): Promise<void> {
  if (!process.env["SMTP_USER"] || !process.env["SMTP_PASS"]) {
    logger.warn({ subject }, "Email not configured — SMTP_USER/SMTP_PASS missing");
    return;
  }
  await getMailTransporter().sendMail({
    from: process.env["SMTP_USER"],
    to: REPORT_EMAIL,
    subject,
    text: body,
  });
  logger.info({ to: REPORT_EMAIL, subject }, "Report email sent");
}

async function sendWhatsApp(message: string): Promise<void> {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_WHATSAPP_NUMBER"];
  if (!sid || !token || !from) {
    logger.warn("WhatsApp not configured — Twilio credentials missing");
    return;
  }
  const twilio = (await import("twilio")).default;
  const client = twilio(sid, token);
  for (const to of [WHATSAPP_1, WHATSAPP_2]) {
    await client.messages.create({ from: `whatsapp:${from}`, to: `whatsapp:${to}`, body: message });
    logger.info({ to }, "WhatsApp message sent");
  }
}

// ── Retry wrapper: 2 attempts → save to failed_reports → retry once after 10 min ──

async function sendWithRetry(
  sendFn: () => Promise<void>,
  type: string,
  subject: string,
  content: string,
  dateStr: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await sendFn();
      return;
    } catch (err) {
      logger.error({ err, attempt, type }, `Notification attempt ${attempt} failed`);
      logNotificationError(type, subject, err);
    }
  }

  // Both attempts failed — save backup and retry once more after 10 minutes
  const filename = `report_${type}_${dateStr}.txt`;
  saveFailedReport(filename, content);
  logger.warn({ type, file: filename }, "Report saved to failed_reports/. Retrying in 10 minutes.");

  setTimeout(async () => {
    try {
      await sendFn();
      logger.info({ type }, "Report delivered on final retry (10 min)");
    } catch (err) {
      logger.error({ err, type }, "Final retry failed — report is in failed_reports/ for manual review");
      logNotificationError(`${type}_final`, subject, err);
    }
  }, 10 * 60 * 1000);
}

export async function sendAlert(subject: string, message: string): Promise<void> {
  const banner = modeBanner();
  await Promise.allSettled([
    sendEmail(subject, `${banner}\n\n${message}`),
    sendWhatsApp(`🤖 Squadron AI\n${banner}\n\n${subject}\n${message}`),
  ]);
}

export async function sendModeChangeAlert(newMode: "paper" | "live", solBalance: number): Promise<void> {
  const dateStr = new Date().toISOString().split("T")[0]!;

  if (newMode === "live") {
    const subject = "⚠️ Squadron AI — LIVE MODE ACTIVATED";
    const body = [
      `⚠️ LIVE TRADING MODE ACTIVATED`,
      `Real SOL execution is now active.`,
      `Activated at: ${new Date().toUTCString()}`,
      `Starting balance: ${solBalance.toFixed(4)} SOL`,
      `All trades will use real funds from this point.`,
    ].join("\n");
    const waMsg = `⚠️ Squadron AI switched to LIVE MODE. Real SOL execution active. Balance: ${solBalance.toFixed(4)} SOL`;

    await sendWithRetry(
      () => Promise.all([sendEmail(subject, body), sendWhatsApp(waMsg)]).then(() => {}),
      "live_activation", subject, body, dateStr,
    );
    logger.warn({ solBalance }, "LIVE MODE notification sent");
  } else {
    const subject = "Squadron AI — Returned to Simulation Mode";
    const body = `Squadron AI has returned to SIMULATION MODE. No real trades will execute.`;
    await sendWithRetry(
      () => Promise.all([sendEmail(subject, body), sendWhatsApp(body)]).then(() => {}),
      "paper_activation", subject, body, dateStr,
    );
    logger.info("PAPER MODE notification sent");
  }
}

// ── AI Weekly Recommendation (OpenRouter) ────────────────────────────────────

async function getWeeklyAiRecommendation(stats: {
  winRate: number;
  expectancy: number;
  rugsMissed: number;
  circuitTriggers: number;
  totalTrades: number;
}): Promise<string> {
  const key = process.env["OPENROUTER_API_KEY"];
  if (!key) {
    // Deterministic fallback if no key
    if (stats.expectancy < 0 || stats.rugsMissed > 3) return "Return to Paper Trading";
    if (stats.winRate < 0.35 || stats.circuitTriggers >= 2) return "Reduce Position Size";
    return "Continue Live Trading";
  }

  try {
    const client = new OpenAI({
      apiKey: key,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: { "HTTP-Referer": "https://squadron-ai.replit.app", "X-Title": "Squadron AI" },
    });

    const prompt = `Weekly Solana meme coin trading performance:
- Total trades: ${stats.totalTrades}
- Win rate: ${(stats.winRate * 100).toFixed(1)}%
- Expectancy per trade: ${stats.expectancy.toFixed(4)} SOL
- Rugs slipped through risk gate: ${stats.rugsMissed}
- Circuit breaker triggers: ${stats.circuitTriggers}

Respond with EXACTLY one option (no other text):
- Continue Live Trading
- Reduce Position Size
- Return to Paper Trading`;

    const resp = await client.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        {
          role: "system",
          content:
            "You are a crypto trading risk advisor. Respond with exactly one of the provided options, nothing else.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 12,
    });

    const rec = resp.choices[0]?.message?.content?.trim() ?? "";
    if (rec.toLowerCase().includes("paper")) return "Return to Paper Trading";
    if (rec.toLowerCase().includes("reduce")) return "Reduce Position Size";
    return "Continue Live Trading";
  } catch (err) {
    logger.warn({ err }, "OpenRouter AI weekly recommendation failed — using fallback");
    if (stats.expectancy < 0 || stats.rugsMissed > 3) return "Return to Paper Trading";
    if (stats.winRate < 0.35) return "Reduce Position Size";
    return "Continue Live Trading";
  }
}

// ── Report text builders ─────────────────────────────────────────────────────

async function buildDailyReportText(): Promise<{ text: string; subject: string; snapshot: ReturnType<typeof saveDailySnapshot> extends void ? any : never }> {
  const report = generateDailyReport();
  const sess = getSessionStats();
  const regime = getRegime();
  const circuit = getCircuitState();
  const mode = modeLabel();
  const banner = modeBanner();
  const dateStr = report.date;

  const endBalance = sess.lastKnownBalance;
  const startBalance = sess.dayStartBalance;
  const pnlSol = endBalance - startBalance;
  const pnlUsd = pnlSol * sess.solPriceUsd;
  const pnlPct = startBalance > 0 ? (pnlSol / startBalance) * 100 : 0;
  const jitoAvg = sess.jitoTipCount > 0 ? sess.jitoTipsPaidSol / sess.jitoTipCount : 0;

  const biggestWinLine = report.biggestWin
    ? `${report.biggestWin.tokenSymbol} — ${report.biggestWin.multiplier.toFixed(2)}x gain (+${report.biggestWin.pnlSol.toFixed(4)} SOL)`
    : "—";
  const biggestLossLine = report.biggestLoss
    ? `${report.biggestLoss.tokenSymbol} — ${report.biggestLoss.reason} (${report.biggestLoss.pnlSol.toFixed(4)} SOL)`
    : "—";

  const subject = `Squadron AI — ${mode} ${dateStr}`;
  const text = [
    `╔══════════════════════════════════════════╗`,
    `  ${mode}`,
    `  ${dateStr}`,
    `  ${banner}`,
    `╚══════════════════════════════════════════╝`,
    ``,
    `TRADING SUMMARY`,
    `────────────────────────────────────────`,
    `Total Trades:       ${report.totalTrades}`,
    `Wins:               ${report.wins}`,
    `Losses:             ${report.losses}`,
    `Win Rate:           ${(report.winRate * 100).toFixed(1)}%`,
    `Avg Win:            +${report.avgWinSol.toFixed(4)} SOL`,
    `Avg Loss:           -${report.avgLossSol.toFixed(4)} SOL`,
    `Expectancy/Trade:   ${report.expectancy >= 0 ? "+" : ""}${report.expectancy.toFixed(4)} SOL`,
    ``,
    `NET PROFIT / LOSS`,
    `────────────────────────────────────────`,
    `P&L (SOL):          ${pnlSol >= 0 ? "+" : ""}${pnlSol.toFixed(4)} SOL`,
    `P&L (USD):          ${pnlUsd >= 0 ? "+" : ""}$${pnlUsd.toFixed(2)}`,
    `P&L (%):            ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`,
    `Starting Balance:   ${startBalance.toFixed(4)} SOL ($${(startBalance * sess.solPriceUsd).toFixed(2)})`,
    `Ending Balance:     ${endBalance.toFixed(4)} SOL ($${(endBalance * sess.solPriceUsd).toFixed(2)})`,
    ``,
    `RISK CONTROL`,
    `────────────────────────────────────────`,
    `Rugs Caught:        ${sess.rugsCaught}  (blocked by risk gate)`,
    `Rugs Missed:        ${sess.rugsMissed}  (slipped through)`,
    `Top Failure Reason: ${report.topFailureReason}`,
    ``,
    `TRADE HIGHLIGHTS`,
    `────────────────────────────────────────`,
    `Biggest Win:        ${biggestWinLine}`,
    `Biggest Loss:       ${biggestLossLine}`,
    ``,
    `MARKET REGIME`,
    `────────────────────────────────────────`,
    `Current Regime:     ${regime.regime}`,
    `Description:        ${regime.description}`,
    `Recent Win Rate:    ${(regime.recentWinRate * 100).toFixed(1)}%`,
    ``,
    `JITO TIP EFFICIENCY`,
    `────────────────────────────────────────`,
    `Avg Tip Per Trade:  ${jitoAvg.toFixed(6)} SOL`,
    `Total Tips Paid:    ${sess.jitoTipsPaidSol.toFixed(6)} SOL (${sess.jitoTipCount} trades)`,
    ``,
    `═══════════════════════════════════════════`,
    `Generated: ${new Date().toUTCString()}`,
    `Squadron AI — Tactical Meme Sniper`,
  ].join("\n");

  // Archive daily snapshot for weekly/monthly reports
  const snapshot = {
    date: dateStr,
    totalTrades: report.totalTrades,
    wins: report.wins,
    losses: report.losses,
    winRate: report.winRate,
    totalPnlSol: report.totalPnlSol,
    pnlUsd,
    pnlPct,
    startBalanceSol: startBalance,
    endBalanceSol: endBalance,
    rugsCaught: sess.rugsCaught,
    rugsMissed: sess.rugsMissed,
    biggestWin: report.biggestWin ?? null,
    biggestLoss: report.biggestLoss ?? null,
    jitoTipAvgSol: jitoAvg,
    jitoTipCount: sess.jitoTipCount,
    regime: regime.regime,
    circuitBreakerTriggers: sess.circuitBreakerTriggers,
    conservativeModeTriggers: sess.conservativeModeTriggers,
    isPaperMode: isPaperMode(),
  };
  saveDailySnapshot(snapshot);

  return { text, subject, snapshot: undefined as any };
}

async function buildWeeklyReportText(): Promise<{ text: string; subject: string }> {
  const snaps = getDailySnapshots(7);
  const banner = modeBanner();
  const dateStr = new Date().toISOString().split("T")[0]!;
  const mode = modeLabel();

  const totalTrades = snaps.reduce((s, d) => s + d.totalTrades, 0);
  const totalWins = snaps.reduce((s, d) => s + d.wins, 0);
  const totalLosses = snaps.reduce((s, d) => s + d.losses, 0);
  const overallWinRate = totalTrades > 0 ? totalWins / (totalWins + totalLosses) : 0;
  const totalPnlSol = snaps.reduce((s, d) => s + d.totalPnlSol, 0);
  const totalPnlUsd = snaps.reduce((s, d) => s + d.pnlUsd, 0);
  const totalRugsCaught = snaps.reduce((s, d) => s + d.rugsCaught, 0);
  const totalRugsMissed = snaps.reduce((s, d) => s + d.rugsMissed, 0);
  const totalCircuit = snaps.reduce((s, d) => s + d.circuitBreakerTriggers, 0);
  const avgExpectancy =
    snaps.length > 0 ? snaps.reduce((s, d) => s + d.totalPnlSol / Math.max(d.totalTrades, 1), 0) / snaps.length : 0;

  const bestDay = snaps.length > 0
    ? snaps.reduce((a, b) => (a.totalPnlSol >= b.totalPnlSol ? a : b))
    : null;
  const worstDay = snaps.length > 0
    ? snaps.reduce((a, b) => (a.totalPnlSol <= b.totalPnlSol ? a : b))
    : null;

  // Dominant regime by frequency
  const regimeCounts: Record<string, number> = {};
  snaps.forEach((d) => { regimeCounts[d.regime] = (regimeCounts[d.regime] ?? 0) + 1; });
  const dominantRegime = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "UNKNOWN";

  // OpenRouter AI recommendation
  const aiRec = await getWeeklyAiRecommendation({
    winRate: overallWinRate,
    expectancy: avgExpectancy,
    rugsMissed: totalRugsMissed,
    circuitTriggers: totalCircuit,
    totalTrades,
  });

  const subject = `Squadron AI — Weekly ${mode} ending ${dateStr}`;
  const text = [
    `╔══════════════════════════════════════════╗`,
    `  SQUADRON AI — 7-DAY WEEKLY REPORT`,
    `  Week ending ${dateStr}`,
    `  ${banner}`,
    `╚══════════════════════════════════════════╝`,
    ``,
    `WEEKLY TRADING SUMMARY`,
    `────────────────────────────────────────`,
    `Trading Days:       ${snaps.length} / 7`,
    `Total Trades:       ${totalTrades}`,
    `Total Wins:         ${totalWins}`,
    `Total Losses:       ${totalLosses}`,
    `Overall Win Rate:   ${(overallWinRate * 100).toFixed(1)}%`,
    `Net P&L (SOL):      ${totalPnlSol >= 0 ? "+" : ""}${totalPnlSol.toFixed(4)} SOL`,
    `Net P&L (USD):      ${totalPnlUsd >= 0 ? "+" : ""}$${totalPnlUsd.toFixed(2)}`,
    `Avg Expectancy:     ${avgExpectancy >= 0 ? "+" : ""}${avgExpectancy.toFixed(4)} SOL/trade`,
    ``,
    `RISK CONTROL`,
    `────────────────────────────────────────`,
    `Rugs Avoided:       ${totalRugsCaught}`,
    `Rugs Missed:        ${totalRugsMissed}`,
    `Circuit Triggers:   ${totalCircuit}`,
    ``,
    `DAY HIGHLIGHTS`,
    `────────────────────────────────────────`,
    `Best Day:           ${bestDay ? `${bestDay.date}  +${bestDay.totalPnlSol.toFixed(4)} SOL` : "—"}`,
    `Worst Day:          ${worstDay ? `${worstDay.date}  ${worstDay.totalPnlSol.toFixed(4)} SOL` : "—"}`,
    `Dominant Regime:    ${dominantRegime}`,
    ``,
    `AI RECOMMENDATION`,
    `────────────────────────────────────────`,
    `→  ${aiRec}`,
    `   (Generated by OpenRouter AI based on weekly performance)`,
    ``,
    snaps.length === 0 ? "No daily snapshots found — this is the first week." : "",
    `═══════════════════════════════════════════`,
    `Generated: ${new Date().toUTCString()}`,
    `Squadron AI — Tactical Meme Sniper`,
  ].filter((l) => l !== undefined).join("\n");

  return { text, subject };
}

async function buildMonthlyReportText(): Promise<{ text: string; subject: string }> {
  const now = new Date();
  // Report covers previous month
  const prevMonth = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
  const prevYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const monthName = new Date(prevYear, prevMonth - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const snaps = getMonthSnapshots(prevYear, prevMonth);
  const banner = modeBanner();
  const mode = modeLabel();
  const sess = getSessionStats();
  const circuit = getCircuitState();
  const weights = getWeights();
  const weightsHistory = readWeightsHistory();

  const tradingDays = snaps.filter((d) => d.totalTrades > 0).length;
  const totalTrades = snaps.reduce((s, d) => s + d.totalTrades, 0);
  const totalWins = snaps.reduce((s, d) => s + d.wins, 0);
  const totalLosses = snaps.reduce((s, d) => s + d.losses, 0);
  const overallWinRate = (totalWins + totalLosses) > 0 ? totalWins / (totalWins + totalLosses) : 0;
  const totalPnlSol = snaps.reduce((s, d) => s + d.totalPnlSol, 0);
  const totalPnlUsd = snaps.reduce((s, d) => s + d.pnlUsd, 0);
  const totalRugsCaught = snaps.reduce((s, d) => s + d.rugsCaught, 0);
  const totalRugsMissed = snaps.reduce((s, d) => s + d.rugsMissed, 0);
  const totalCircuit = snaps.reduce((s, d) => s + d.circuitBreakerTriggers, 0);
  const totalConservative = snaps.reduce((s, d) => s + d.conservativeModeTriggers, 0);

  const startBalance = snaps[0]?.startBalanceSol ?? sess.dayStartBalance;
  const endBalance = snaps[snaps.length - 1]?.endBalanceSol ?? sess.lastKnownBalance;
  const solPrice = sess.solPriceUsd;

  // Best/worst weeks (group by week number)
  const weekMap: Record<string, { pnl: number; trades: number }> = {};
  snaps.forEach((d) => {
    const week = `W${Math.ceil(new Date(d.date).getUTCDate() / 7)}`;
    if (!weekMap[week]) weekMap[week] = { pnl: 0, trades: 0 };
    weekMap[week].pnl += d.totalPnlSol;
    weekMap[week].trades += d.totalTrades;
  });
  const weekEntries = Object.entries(weekMap);
  const bestWeek = weekEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const worstWeek = weekEntries.sort((a, b) => a[1].pnl - b[1].pnl)[0];

  const subject = `Squadron AI — Monthly ${mode} — ${monthName}`;
  const text = [
    `╔══════════════════════════════════════════╗`,
    `  SQUADRON AI — MONTHLY REPORT`,
    `  ${monthName.toUpperCase()}`,
    `  ${banner}`,
    `╚══════════════════════════════════════════╝`,
    ``,
    `MONTHLY TRADING SUMMARY`,
    `────────────────────────────────────────`,
    `Total Trading Days: ${tradingDays}`,
    `Total Trades:       ${totalTrades}`,
    `Total Wins:         ${totalWins}`,
    `Total Losses:       ${totalLosses}`,
    `Overall Win Rate:   ${(overallWinRate * 100).toFixed(1)}%`,
    ``,
    `PROFIT & LOSS`,
    `────────────────────────────────────────`,
    `Starting Balance:   ${startBalance.toFixed(4)} SOL ($${(startBalance * solPrice).toFixed(2)})`,
    `Ending Balance:     ${endBalance.toFixed(4)} SOL ($${(endBalance * solPrice).toFixed(2)})`,
    `Total P&L (SOL):    ${totalPnlSol >= 0 ? "+" : ""}${totalPnlSol.toFixed(4)} SOL`,
    `Total P&L (USD):    ${totalPnlUsd >= 0 ? "+" : ""}$${totalPnlUsd.toFixed(2)}`,
    ``,
    `RISK CONTROL`,
    `────────────────────────────────────────`,
    `Rugs Blocked:       ${totalRugsCaught}`,
    `Rugs Missed:        ${totalRugsMissed}`,
    ``,
    `CIRCUIT BREAKER STATISTICS`,
    `────────────────────────────────────────`,
    `Fortress Triggers:  ${totalCircuit}`,
    `Conservative Mode:  ${totalConservative} activations`,
    `Kill Switch History:${circuit.killSwitchHistory.length} total events`,
    ``,
    `WEEK-BY-WEEK BREAKDOWN`,
    `────────────────────────────────────────`,
    bestWeek ? `Best Week:          ${bestWeek[0]}  +${bestWeek[1].pnl.toFixed(4)} SOL (${bestWeek[1].trades} trades)` : "Best Week:          —",
    worstWeek ? `Worst Week:         ${worstWeek[0]}  ${worstWeek[1].pnl.toFixed(4)} SOL (${worstWeek[1].trades} trades)` : "Worst Week:         —",
    ``,
    `MOONBAG VAULT`,
    `────────────────────────────────────────`,
    `Active Moonbags:    ${getMoonbags().length}`,
    `Total Value:        ${getTotalMoonbagValueSol().toFixed(4)} SOL ($${(getTotalMoonbagValueSol() * solPrice).toFixed(2)})`,
    ``,
    `BLOCK 17 — WEIGHT DRIFT LOG`,
    `────────────────────────────────────────`,
    `Current Weights:`,
    `  RugCheck:         ${weights.rugcheck}%`,
    `  Liquidity:        ${weights.liquidity}%`,
    `  Volume:           ${weights.volume}%`,
    `  Holder Conc:      ${weights.holderConcentration}%`,
    `  Momentum:         ${weights.momentum}%`,
    `  AI Score:         ${weights.aiScore}%`,
    ``,
    `Weight Change History (last ${Math.min(weightsHistory.length, 10)} events):`,
    ...JSON.stringify(weightsHistory.slice(-10), null, 2).split("\n").map((l) => `  ${l}`),
    ``,
    `═══════════════════════════════════════════`,
    `Generated: ${new Date().toUTCString()}`,
    `Squadron AI — Tactical Meme Sniper`,
  ].join("\n");

  return { text, subject };
}

// ── Cron scheduler ───────────────────────────────────────────────────────────

export function startReportingEngine(): void {
  // Daily at 23:00 UTC
  cron.schedule("0 23 * * *", async () => {
    try {
      const { text, subject } = await buildDailyReportText();
      const waMsg = `🤖 ${subject}\n\n${text.split("\n").slice(0, 20).join("\n")}`;
      await sendWithRetry(
        () => Promise.all([sendEmail(subject, text), sendWhatsApp(waMsg)]).then(() => {}),
        "daily", subject, text,
        new Date().toISOString().split("T")[0]!,
      );
    } catch (err) {
      logger.error({ err }, "Daily report generation failed");
    }
  }, { timezone: "UTC" });

  // Weekly — every Sunday at 23:30 UTC
  cron.schedule("30 23 * * 0", async () => {
    try {
      const { text, subject } = await buildWeeklyReportText();
      const waMsg = `🤖 ${subject}\n\n${text.split("\n").slice(0, 20).join("\n")}`;
      await sendWithRetry(
        () => Promise.all([sendEmail(subject, text), sendWhatsApp(waMsg)]).then(() => {}),
        "weekly", subject, text,
        new Date().toISOString().split("T")[0]!,
      );
    } catch (err) {
      logger.error({ err }, "Weekly report generation failed");
    }
  }, { timezone: "UTC" });

  // Monthly — 1st of every month at 08:00 UTC
  cron.schedule("0 8 1 * *", async () => {
    try {
      const { text, subject } = await buildMonthlyReportText();
      const waMsg = `🤖 ${subject}\n\n${text.split("\n").slice(0, 20).join("\n")}`;
      await sendWithRetry(
        () => Promise.all([sendEmail(subject, text), sendWhatsApp(waMsg)]).then(() => {}),
        "monthly", subject, text,
        new Date().toISOString().split("T")[0]!,
      );
    } catch (err) {
      logger.error({ err }, "Monthly report generation failed");
    }
  }, { timezone: "UTC" });

  logger.info("📊 Report engine started — Daily 23:00 · Weekly Sun 23:30 · Monthly 1st 08:00 (UTC)");
}
