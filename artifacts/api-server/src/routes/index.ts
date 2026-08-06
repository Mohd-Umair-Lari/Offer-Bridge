import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dataRouter from "./data";
import paymentRouter from "./payment";
import notificationsRouter from "./notifications";
import crawlerRouter from "./crawler";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dataRouter);
router.use(paymentRouter);
router.use(notificationsRouter);
router.use(crawlerRouter);

export default router;
