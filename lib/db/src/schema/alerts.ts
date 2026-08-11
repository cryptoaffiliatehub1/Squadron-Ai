import { pgTable, serial, text, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertDirectionEnum = pgEnum("alert_direction", ["above", "below"]);

export const priceAlertsTable = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  tokenMint: text("token_mint").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenName: text("token_name").notNull(),
  targetPrice: numeric("target_price", { precision: 20, scale: 9 }).notNull(),
  direction: alertDirectionEnum("direction").notNull(),
  isTriggered: boolean("is_triggered").notNull().default(false),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPriceAlertSchema = createInsertSchema(priceAlertsTable).omit({
  id: true,
  isTriggered: true,
  triggeredAt: true,
  createdAt: true,
});
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type PriceAlert = typeof priceAlertsTable.$inferSelect;
