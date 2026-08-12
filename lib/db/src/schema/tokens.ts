import { pgTable, serial, text, numeric, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { safetyStatusEnum } from "./trades";

export const skippedTokensTable = pgTable("skipped_tokens", {
  id: serial("id").primaryKey(),
  tokenMint: text("token_mint").notNull(),
  tokenName: text("token_name").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  logoUrl: text("logo_url"),
  reason: text("reason").notNull(),
  safetyScore: text("safety_score"),
  liquidityUsd: numeric("liquidity_usd", { precision: 20, scale: 2 }),
  marketCap: numeric("market_cap", { precision: 20, scale: 2 }),    // Fix 4
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const detectedTokensTable = pgTable("detected_tokens", {
  id: serial("id").primaryKey(),
  tokenMint: text("token_mint").notNull(),
  tokenName: text("token_name").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  logoUrl: text("logo_url"),
  safetyStatus: safetyStatusEnum("safety_status").notNull().default("pending"),
  failureLabel: text("failure_label"),                               // Fix 3: specific badge
  marketCap: numeric("market_cap", { precision: 20, scale: 2 }),
  liquidityUsd: numeric("liquidity_usd", { precision: 20, scale: 2 }),
  volume5m: numeric("volume_5m", { precision: 20, scale: 2 }),
  mintRevoked: boolean("mint_revoked"),
  buyTxns5m: integer("buy_txns_5m"),
  sellTxns5m: integer("sell_txns_5m"),
  probabilityScore: integer("probability_score"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const insertSkippedTokenSchema = createInsertSchema(skippedTokensTable).omit({ id: true, detectedAt: true });
export type InsertSkippedToken = z.infer<typeof insertSkippedTokenSchema>;
export type SkippedToken = typeof skippedTokensTable.$inferSelect;

export const insertDetectedTokenSchema = createInsertSchema(detectedTokensTable).omit({ id: true, detectedAt: true });
export type InsertDetectedToken = z.infer<typeof insertDetectedTokenSchema>;
export type DetectedToken = typeof detectedTokensTable.$inferSelect;
