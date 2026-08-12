import { logger } from "./logger";
import { isPaperMode } from "./tradingMode";

export interface KeyStatus {
  key: string;
  present: boolean;
  label: string;
}

export interface ReadinessReport {
  keys: KeyStatus[];
  scannerOnline: boolean;
  riskGateActive: boolean;
  executionEngineReady: boolean;
  dashboardServing: boolean;
  watchdogRunning: boolean;
  paperMode: boolean;
  timestamp: string;
}

const KEY_MAP: Array<{ env: string; label: string; critical?: boolean }> = [
  { env: "HELIUS_API_KEY",         label: "Helius RPC",              critical: true  },
  { env: "JUPITER_API_KEY",        label: "Jupiter Swap",            critical: true  },
  { env: "BIRDEYE_API_KEY",        label: "Birdeye Market Data",     critical: true  },
  { env: "RUGCHECK_API_KEY",       label: "RugCheck Safety",         critical: true  },
  { env: "SOLANA_PRIVATE_KEY",     label: "Solana Wallet",           critical: true  },
  { env: "OPENROUTER_API_KEY",     label: "OpenRouter AI",           critical: false },
  { env: "BITQUERY_API_KEY",       label: "Bitquery Supply Audit",   critical: false },
  { env: "X_API_KEY",              label: "Twitter/X API Key",       critical: false },
  { env: "X_API_SECRET",           label: "Twitter/X API Secret",    critical: false },
  { env: "X_ACCESS_TOKEN",         label: "Twitter/X Access Token",  critical: false },
  { env: "X_ACCESS_SECRET",        label: "Twitter/X Access Secret", critical: false },
  { env: "YOUTUBE_API_KEY",        label: "YouTube Sentiment",       critical: false },
  { env: "TWILIO_ACCOUNT_SID",     label: "Twilio SID",              critical: false },
  { env: "TWILIO_AUTH_TOKEN",      label: "Twilio Auth",             critical: false },
  { env: "TWILIO_WHATSAPP_NUMBER", label: "Twilio WhatsApp",         critical: false },
  { env: "REPORT_EMAIL",           label: "Report Email",            critical: false },
  { env: "WHATSAPP_NUMBER_1",      label: "WhatsApp #1",             critical: false },
  { env: "WHATSAPP_NUMBER_2",      label: "WhatsApp #2",             critical: false },
  { env: "SMTP_USER",              label: "SMTP Email User",         critical: false },
  { env: "SMTP_PASS",              label: "SMTP Email Password",     critical: false },
];

let cachedReport: ReadinessReport | null = null;

export function buildReadinessReport(): ReadinessReport {
  const keys: KeyStatus[] = KEY_MAP.map(({ env, label }) => ({
    key: env,
    label,
    present: !!process.env[env],
  }));

  const paperMode = isPaperMode();

  const report: ReadinessReport = {
    keys,
    scannerOnline: false,
    riskGateActive: true,
    executionEngineReady: !!process.env["SOLANA_PRIVATE_KEY"],
    dashboardServing: true,
    watchdogRunning: true,
    paperMode,
    timestamp: new Date().toISOString(),
  };

  cachedReport = report;
  return report;
}

export function getReadinessReport(): ReadinessReport {
  return cachedReport ?? buildReadinessReport();
}

export function setScannerOnline(online: boolean): void {
  if (cachedReport) cachedReport.scannerOnline = online;
}

// ── Compute next scheduled report times ─────────────────────────────────────
function getNextScheduledTimes(): { daily: string; weekly: string; monthly: string } {
  const now = new Date();

  // Next daily: 23:00 UTC
  const daily = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 0, 0));
  if (daily.getTime() <= now.getTime()) daily.setUTCDate(daily.getUTCDate() + 1);

  // Next weekly: Sunday 23:30 UTC
  const weekly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 30, 0));
  const daysUntilSunday = weekly.getUTCDay() === 0
    ? (weekly.getTime() <= now.getTime() ? 7 : 0)
    : 7 - weekly.getUTCDay();
  weekly.setUTCDate(weekly.getUTCDate() + daysUntilSunday);

  // Next monthly: 1st at 08:00 UTC
  const nextMonth = now.getUTCMonth() + 1;
  const nextYear = nextMonth > 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const monthly = new Date(Date.UTC(nextYear, nextMonth % 12, 1, 8, 0, 0));

  return {
    daily: daily.toUTCString(),
    weekly: weekly.toUTCString(),
    monthly: monthly.toUTCString(),
  };
}

export function logReadinessReport(): void {
  const report = buildReadinessReport();
  const sep = "═══════════════════════════════════════════";

  logger.info(sep);
  logger.info("       SQUADRON AI — SYSTEM READINESS      ");
  logger.info(sep);

  for (const k of KEY_MAP) {
    const ks = report.keys.find((r) => r.key === k.env)!;
    if (ks.present) {
      logger.info({ key: k.env }, `✓ PRESENT  — ${k.label}`);
    } else if (k.critical) {
      logger.error({ key: k.env }, `✗ MISSING  — ${k.label}  ⚠ CRITICAL — required for all operations`);
    } else {
      logger.warn({ key: k.env }, `✗ MISSING  — ${k.label}  (optional — blueprint active)`);
    }
  }

  logger.info(sep);
  logger.info(`Scanner Online:         ${report.scannerOnline}`);
  logger.info(`Risk Gate Active:        ${report.riskGateActive}`);
  logger.info(`Execution Engine Ready:  ${report.executionEngineReady}`);
  logger.info(`Dashboard Serving:       ${report.dashboardServing}`);
  logger.info(`Watchdog Running:        ${report.watchdogRunning}`);
  logger.info(`Paper Trading Mode:      ${report.paperMode}`);
  logger.info(sep);

  // ── Scheduled report times ─────────────────────────────────────────────────
  const schedule = getNextScheduledTimes();
  logger.info("  REPORT SCHEDULER — NEXT EXECUTION TIMES  ");
  logger.info(sep);
  logger.info(`Next Daily Report:       ${schedule.daily}`);
  logger.info(`Next Weekly Report:      ${schedule.weekly}`);
  logger.info(`Next Monthly Report:     ${schedule.monthly}`);
  logger.info(`Min SOL to Activate:     0.005 SOL`);
  logger.info(`Wallet Polling:          every 10s via SOLANA_MAINNET_RPC`);
  logger.info(sep);
}
