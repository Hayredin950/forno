import { Router } from "express";
import { body } from "express-validator";
import { getAllOrders, updateOrderStatus } from "../controllers/admin.controller";
import {
  getOrdersSeries,
  getRevenueSeries,
  getTodayRevenue,
  getPopularPizzas,
  getStatusDistribution,
  getHourlyOrders,
} from "../controllers/analytics.controller";
import { listUsers, toggleUserActive, deleteUser } from "../controllers/users.controller";
import { authAdmin } from "../middleware/authAdmin";
import { validate } from "../middleware/validate";
import { uploadImage } from "../controllers/upload.controller";
import {
  getAdminSettings,
  updateAdminSettings,
  listSubscribers,
} from "../controllers/siteConfig.controller";

const router = Router();

router.use(authAdmin);

// Orders
router.get("/orders", getAllOrders);
router.patch(
  "/orders/:id/status",
  [body("orderStatus").notEmpty().withMessage("orderStatus is required")],
  validate,
  updateOrderStatus,
);

// Analytics (all database-driven)
router.get("/analytics/orders", getOrdersSeries);
router.get("/analytics/revenue", getRevenueSeries);
router.get("/analytics/revenue-today", getTodayRevenue);
router.get("/analytics/popular", getPopularPizzas);
router.get("/analytics/status", getStatusDistribution);
router.get("/analytics/hourly", getHourlyOrders);

// User management
router.get("/users", listUsers);
router.patch("/users/:id/toggle", toggleUserActive);
router.delete("/users/:id", deleteUser);

// Site / business settings (social links, contact, delivery origin)
router.get("/settings", getAdminSettings);
router.put("/settings", updateAdminSettings);
router.get("/settings/subscribers", listSubscribers);

// Image upload (base64 data URL → stored under /images/uploads/…)
router.post("/upload", uploadImage);

export default router;
