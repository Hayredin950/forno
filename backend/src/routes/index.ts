import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth.routes";
import pizzaRouter from "./pizza.routes";
import orderRouter from "./order.routes";
import adminRouter from "./admin.routes";
import inventoryRouter from "./inventory.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/pizzas", pizzaRouter);
router.use("/orders", orderRouter);
router.use("/admin", adminRouter);
router.use("/admin/inventory", inventoryRouter);

export default router;
