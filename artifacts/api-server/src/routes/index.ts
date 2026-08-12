import { Router, type IRouter } from "express";
import healthRouter from "./health";
import walletRouter from "./wallet";
import tradesRouter from "./trades";
import tokensRouter from "./tokens";
import botRouter from "./bot";
import alertsRouter from "./alerts";
import configRouter from "./config";
import paperRouter from "./paper";
import tradingModeRouter from "./trading-mode";

const router: IRouter = Router();

router.use(healthRouter);
router.use(walletRouter);
router.use(tradesRouter);
router.use(tokensRouter);
router.use(botRouter);
router.use(alertsRouter);
router.use(configRouter);
router.use(paperRouter);
router.use(tradingModeRouter);

export default router;
