import { Router } from "express";
import { listPizzas, getPizzaById, listIngredients } from "../controllers/pizza.controller";

const router = Router();

router.get("/", listPizzas);
router.get("/ingredients/all", listIngredients);
router.get("/:id", getPizzaById);

export default router;
