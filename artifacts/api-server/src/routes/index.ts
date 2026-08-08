import { Router, type IRouter } from "express";
import healthRouter from "./health";
<<<<<<< HEAD
import authRouter from "./auth";
import dataRouter from "./data";
import paymentRouter from "./payment";
import notificationsRouter from "./notifications";
=======
>>>>>>> b49c74b (tried a major fix for the crawler)
import crawlerRouter from "./crawler";

const router: IRouter = Router();

router.use(healthRouter);
<<<<<<< HEAD
router.use(authRouter);
router.use(dataRouter);
router.use(paymentRouter);
router.use(notificationsRouter);
router.use(crawlerRouter);
=======
router.use("/crawler", crawlerRouter);
>>>>>>> b49c74b (tried a major fix for the crawler)

export default router;
