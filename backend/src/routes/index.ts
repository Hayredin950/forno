import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth.routes";
import pizzaRouter from "./pizza.routes";
import orderRouter from "./order.routes";
import adminRouter from "./admin.routes";
import inventoryRouter from "./inventory.routes";
import siteRouter from "./site.routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(siteRouter);
router.use("/auth", authRouter);
router.use("/pizzas", pizzaRouter);
router.use("/orders", orderRouter);
// More specific "/admin/inventory" must be mounted before the blanket
// "/admin" router (which requires authAdmin on every path under it),
// otherwise inventory's intentionally-public GET / route gets shadowed
// and always 401s before Express reaches inventoryRouter.
router.use("/admin/inventory", inventoryRouter);
router.use("/admin", adminRouter);

export default router;
