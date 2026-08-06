import { Router } from "express";
import { listPizzas, getPizzaById, listIngredients, adminListPizzas, adminCreatePizza, adminUpdatePizza, adminDeletePizza, adminTogglePizzaAvailability } from "../controllers/pizza.controller";
import { authAdmin } from "../middleware/authAdmin";

const router = Router();

// Public routes
router.get("/", listPizzas);
router.get("/ingredients/all", listIngredients);
router.get("/:id", getPizzaById);

// Admin routes (protected)
router.get("/admin/list", authAdmin, adminListPizzas);
router.post("/admin/create", authAdmin, adminCreatePizza);
router.put("/admin/update/:id", authAdmin, adminUpdatePizza);
router.delete("/admin/delete/:id", authAdmin, adminDeletePizza);
router.patch("/admin/toggle/:id", authAdmin, adminTogglePizzaAvailability);

export default router;
