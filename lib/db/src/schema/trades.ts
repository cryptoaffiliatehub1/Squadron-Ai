import { pgTable, serial, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeTypeEnum = pgEnum("trade_type", ["buy", "sell"]);
export const tradeStatusEnum = pgEnum("trade_status", ["success", "failed", "pending"]);
export const safetyStatusEnum = pgEnum("safety_status", ["pending", "good", "risky", "unknown"]);

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  tokenMint: text("token_mint").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenName: text("token_name").notNull(),
  type: tradeTypeEnum("type").notNull(),
  amountSol: numeric("amount_sol", { precision: 20, scale: 9 }).notNull(),
  amountTokens: numeric("amount_tokens", { precision: 30, scale: 6 }).notNull(),
  priceUsd: numeric("price_usd", { precision: 20, scale: 6 }).notNull(),
  pnlUsd: numeric("pnl_usd", { precision: 20, scale: 6 }),
  txSignature: text("tx_signature").notNull(),
  status: tradeStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  tag: text("tag"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
