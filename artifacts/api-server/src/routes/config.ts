import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

type Network = "devnet" | "mainnet";

interface AppConfig {
  network: Network;
  maxTradeUsd: number;
  squadSlots: number;
  jitoEnabled: boolean;
}

const config: AppConfig = {
  network: "devnet",
  maxTradeUsd: 200,
  squadSlots: 3,
  jitoEnabled: false,
};

router.get("/config", (_req, res) => {
  res.json(config);
});

router.patch("/config", (req, res) => {
  const body = req.body as Partial<AppConfig>;
  if (body.network && (body.network === "devnet" || body.network === "mainnet")) {
    config.network = body.network;
    logger.info({ network: config.network }, "Network mode updated");
  }
  if (typeof body.maxTradeUsd === "number" && body.maxTradeUsd > 0) {
    config.maxTradeUsd = body.maxTradeUsd;
  }
  res.json(config);
});

export { config };
export default router;
