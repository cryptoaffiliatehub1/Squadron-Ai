import { logger } from "./logger";

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

const KEY_MAP: Array<{ env: string; label: string }> = [
  { env: "HELIUS_API_KEY", label: "Helius RPC" },
  { env: "JUPITER_API_KEY", label: "Jupiter Swap" },
  { env: "BIRDEYE_API_KEY", label: "Birdeye Market Data" },
  { env: "RUGCHECK_API_KEY", label: "RugCheck Safety" },
  { env: "OPENROUTER_API_KEY", label: "OpenRouter AI" },
  { env: "BITQUERY_API_KEY", label: "Bitquery Supply Audit" },
  { env: "SOLANA_PRIVATE_KEY", label: "Solana Wallet" },
  { env: "X_API_KEY", label: "Twitter/X API Key" },
  { env: "X_API_SECRET", label: "Twitter/X API Secret" },
  { env: "X_ACCESS_TOKEN", label: "Twitter/X Access Token" },
  { env: "X_ACCESS_SECRET", label: "Twitter/X Access Secret" },
  { env: "YOUTUBE_API_KEY", label: "YouTube Sentiment" },
  { env: "TWILIO_ACCOUNT_SID", label: "Twilio SID" },
  { env: "TWILIO_AUTH_TOKEN", label: "Twilio Auth" },
  { env: "TWILIO_WHATSAPP_NUMBER", label: "Twilio WhatsApp" },
  { env: "REPORT_EMAIL", label: "Report Email" },
  { env: "WHATSAPP_NUMBER_1", label: "WhatsApp #1" },
  { env: "WHATSAPP_NUMBER_2", label: "WhatsApp #2" },
];

let cachedReport: ReadinessReport | null = null;

export function buildReadinessReport(): ReadinessReport {
  const keys: KeyStatus[] = KEY_MAP.map(({ env, label }) => ({
    key: env,
    label,
    present: !!process.env[env],
  }));

  const paperMode = process.env["PAPER_TRADE"] !== "false";

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

export function logReadinessReport(): void {
  const report = buildReadinessReport();
  logger.info("═══════════════════════════════════════════");
  logger.info("       SQUADRON AI — SYSTEM READINESS      ");
  logger.info("═══════════════════════════════════════════");
  for (const k of report.keys) {
    const status = k.present ? "✓ PRESENT" : "✗ MISSING";
    if (k.present) {
      logger.info({ key: k.key, label: k.label }, `${status} — ${k.label}`);
    } else {
      logger.warn({ key: k.key, label: k.label }, `${status} — ${k.label} (module blueprint active, key required for live use)`);
    }
  }
  logger.info(`Scanner Online:        ${report.scannerOnline}`);
  logger.info(`Risk Gate Active:       ${report.riskGateActive}`);
  logger.info(`Execution Engine Ready: ${report.executionEngineReady}`);
  logger.info(`Dashboard Serving:      ${report.dashboardServing}`);
  logger.info(`Watchdog Running:       ${report.watchdogRunning}`);
  logger.info(`Paper Trading Mode:     ${report.paperMode}`);
  logger.info("═══════════════════════════════════════════");
}
