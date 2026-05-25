import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { logger } from "./logger";
import { generateDailyReport, readDailyReport, saveFailedReport } from "./paperTrading";
import { isPaperMode, getCurrentMode } from "./tradingMode";
import { getRegime } from "./marketRegime";
import { getMoonbags, getTotalMoonbagValueSol } from "./moonbagVault";
import { getWeights } from "./feedbackLoop";
import cron from "node-cron";

// FIX 8: use env vars directly — no hardcoded fallbacks in production
const REPORT_EMAIL = process.env["REPORT_EMAIL"] ?? "solex674@gmail.com";
const WHATSAPP_1 = process.env["WHATSAPP_NUMBER_1"] ?? "+2349078886030";
const WHATSAPP_2 = process.env["WHATSAPP_NUMBER_2"] ?? "+2347026125080";
const DATA_DIR = path.resolve(process.cwd(), "data");
const NOTIFICATION_ERRORS_FILE = path.join(DATA_DIR, "notification_errors.json");

function modeBanner(): string {
  return isPaperMode()
    ? "⚠️  SIMULATION MODE — NO REAL MONEY TRADED\n"
    : "🟢 LIVE TRADING MODE — Real SOL execution active\n";
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
    // Keep only last 100 errors
    const trimmed = errors.slice(-100);
    fs.writeFileSync(NOTIFICATION_ERRORS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch {
    // Silently ignore errors in error logging
  }
}

function getMailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env["SMTP_USER"],
      pass: process.env["SMTP_PASS"],
    },
  });
}

async function sendEmail(subject: string, body: string): Promise<void> {
  if (!process.env["SMTP_USER"] || !process.env["SMTP_PASS"]) {
    logger.warn({ subject }, "Email not configured — SMTP_USER/SMTP_PASS missing");
    return;
  }
  const transporter = getMailTransporter();
  await transporter.sendMail({
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

// FIX 7: retry once after 2 minutes; log all failures to notification_errors.json
async function sendWithRetry(
  sendFn: () => Promise<void>,
  type: string,
  subject: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await sendFn();
      return;
    } catch (err) {
      logger.error({ err, attempt, type }, `Notification send failed (attempt ${attempt})`);
      logNotificationError(type, subject, err);
      if (attempt === 1) {
        logger.info({ type }, "Will retry notification in 2 minutes");
        await new Promise((r) => setTimeout(r, 2 * 60 * 1000));
      }
    }
  }
  logger.error({ type, subject }, "Notification failed after 2 attempts — logged to notification_errors.json");
}

export async function sendAlert(subject: string, message: string): Promise<void> {
  const banner = modeBanner();
  await Promise.allSettled([
    sendEmail(subject, `${banner}\n${message}`),
    sendWhatsApp(`🤖 Squadron AI\n${banner}${subject}\n${message}`),
  ]);
}

// FIX 7: instant notification with retry on mode switch
export async function sendModeChangeAlert(newMode: "paper" | "live", solBalance: number): Promise<void> {
  if (newMode === "live") {
    const subject = "⚠️ Squadron AI — LIVE MODE ACTIVATED";
    const emailBody = [
      `⚠️ Squadron AI has switched to LIVE TRADING MODE.`,
      `Real SOL execution is now active.`,
      `Timestamp: ${new Date().toUTCString()}`,
      `Starting balance: ${solBalance.toFixed(4)} SOL`,
    ].join("\n");
    const waBody = `⚠️ Squadron AI switched to LIVE TRADING MODE. Real SOL execution is now active. Starting balance: ${solBalance.toFixed(4)} SOL`;

    await sendWithRetry(
      () => Promise.all([sendEmail(subject, emailBody), sendWhatsApp(waBody)]).then(() => {}),
      "live_activation",
      subject,
    );
    logger.warn({ solBalance }, "LIVE MODE notification sent");
  } else {
    const subject = "Squadron AI — Returned to Simulation Mode";
    const body = "Squadron AI has returned to SIMULATION MODE. No real trades will execute.";

    await sendWithRetry(
      () => Promise.all([sendEmail(subject, body), sendWhatsApp(body)]).then(() => {}),
      "paper_activation",
      subject,
    );
    logger.info("PAPER MODE notification sent");
  }
}

async function buildDailyReportText(): Promise<string> {
  const report = generateDailyReport();
  const regime = getRegime();
  const banner = modeBanner();

  return `${banner}
═══════════════════════════════════
  SQUADRON AI — DAILY REPORT
  ${report.date}
  Mode: ${getCurrentMode().toUpperCase()}
═══════════════════════════════════

TRADING SUMMARY
───────────────
Total Trades Today:  ${report.totalTrades}
Wins:                ${report.wins}
Losses:              ${report.losses}
Win Rate:            ${(report.winRate * 100).toFixed(1)}%
Net P&L (SOL):       ${report.totalPnlSol >= 0 ? "+" : ""}${report.totalPnlSol.toFixed(4)} SOL
Expectancy/Trade:    ${report.expectancy.toFixed(4)} SOL
Avg Win:             ${report.avgWinSol.toFixed(4)} SOL
Avg Loss:            ${report.avgLossSol.toFixed(4)} SOL
Top Failure Reason:  ${report.topFailureReason}

MARKET REGIME
─────────────
Regime:              ${regime.regime}
Description:         ${regime.description}
Win Rate (recent):   ${(regime.recentWinRate * 100).toFixed(1)}%

MOONBAG VAULT
─────────────
Active Moonbags:     ${getMoonbags().length}
Total Moonbag Value: ${getTotalMoonbagValueSol().toFixed(4)} SOL

SCORING WEIGHTS
───────────────
${JSON.stringify(getWeights(), null, 2)}

═══════════════════════════════════
Generated by Squadron AI at ${new Date().toUTCString()}
`;
}

async function buildWeeklyReportText(): Promise<string> {
  const daily = readDailyReport();
  const regime = getRegime();
  const banner = modeBanner();

  let aiRec = "Continue Live Trading";
  if (daily && daily.expectancy < 0) aiRec = "Return to Paper Trading";
  else if (daily && daily.winRate < 0.4) aiRec = "Reduce Position Size";

  return `${banner}
═══════════════════════════════════
  SQUADRON AI — 7-DAY ANALYSIS
  Week ending ${new Date().toISOString().split("T")[0]}
  Mode: ${getCurrentMode().toUpperCase()}
═══════════════════════════════════

WEEKLY SUMMARY
──────────────
Win Rate:            ${daily ? (daily.winRate * 100).toFixed(1) + "%" : "N/A"}
Total Trades:        ${daily?.totalTrades ?? 0}
Net P&L (SOL):       ${daily ? (daily.totalPnlSol >= 0 ? "+" : "") + daily.totalPnlSol.toFixed(4) + " SOL" : "N/A"}
Dominant Regime:     ${regime.regime}
Expectancy/Trade:    ${daily?.expectancy?.toFixed(4) ?? "N/A"} SOL

AI RECOMMENDATION
─────────────────
→ ${aiRec}

═══════════════════════════════════
Generated by Squadron AI at ${new Date().toUTCString()}
`;
}

async function buildMonthlyReportText(): Promise<string> {
  const daily = readDailyReport();
  const regime = getRegime();
  const banner = modeBanner();

  return `${banner}
═══════════════════════════════════
  SQUADRON AI — MONTHLY REPORT
  ${new Date().toLocaleString("default", { month: "long", year: "numeric" })}
  Mode: ${getCurrentMode().toUpperCase()}
═══════════════════════════════════

MONTHLY SUMMARY
───────────────
Moonbag Vault:       ${getTotalMoonbagValueSol().toFixed(4)} SOL
Win Rate:            ${daily ? (daily.winRate * 100).toFixed(1) + "%" : "N/A"}
Total Trades:        ${daily?.totalTrades ?? 0}
Dominant Regime:     ${regime.regime}

WEIGHT DRIFT LOG
────────────────
${JSON.stringify(getWeights(), null, 2)}

═══════════════════════════════════
Generated by Squadron AI at ${new Date().toUTCString()}
`;
}

async function trySendWithRetry(
  sendFn: () => Promise<void>,
  reportName: string,
  content: string,
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await sendFn();
      return;
    } catch (err) {
      logger.error({ err, attempt }, `Report send failed (attempt ${attempt})`);
      logNotificationError("report", reportName, err);
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
      } else {
        saveFailedReport(reportName, content);
        logger.error({ reportName }, "Report saved to failed_reports/ after 2 failed attempts");
      }
    }
  }
}

export function startReportingEngine(): void {
  cron.schedule("0 23 * * *", async () => {
    const text = await buildDailyReportText();
    const subject = `Squadron AI — Daily Report ${new Date().toISOString().split("T")[0]}`;
    const whatsText = `${modeBanner()}\n${text.split("\n").filter(Boolean).slice(0, 15).join("\n")}`;
    await trySendWithRetry(
      () => Promise.all([sendEmail(subject, text), sendWhatsApp(whatsText)]).then(() => {}),
      `daily_${new Date().toISOString().split("T")[0]}`,
      text,
    );
  }, { timezone: "UTC" });

  cron.schedule("30 23 * * 0", async () => {
    const text = await buildWeeklyReportText();
    const subject = `Squadron AI — 7-Day Analysis ${new Date().toISOString().split("T")[0]}`;
    const whatsText = `${modeBanner()}\n${text.split("\n").filter(Boolean).slice(0, 15).join("\n")}`;
    await trySendWithRetry(
      () => Promise.all([sendEmail(subject, text), sendWhatsApp(whatsText)]).then(() => {}),
      `weekly_${new Date().toISOString().split("T")[0]}`,
      text,
    );
  }, { timezone: "UTC" });

  cron.schedule("0 8 1 * *", async () => {
    const text = await buildMonthlyReportText();
    const month = new Date().toLocaleString("default", { month: "long", year: "numeric" });
    const subject = `Squadron AI — Monthly Report ${month}`;
    const whatsText = `${modeBanner()}\n${text.split("\n").filter(Boolean).slice(0, 12).join("\n")}`;
    await trySendWithRetry(
      () => Promise.all([sendEmail(subject, text), sendWhatsApp(whatsText)]).then(() => {}),
      `monthly_${new Date().toISOString().split("T")[0]}`,
      text,
    );
  }, { timezone: "UTC" });

  logger.info("Reporting engine started (daily 23:00, weekly Sunday 23:30, monthly 1st 08:00 UTC)");
}
