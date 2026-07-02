import { Router } from "express";
import { listPizzas, getPizzaById, listIngredients } from "../controllers/pizza.controller";

const router = Router();

router.get("/", listPizzas);
router.get("/:id", getPizzaById);
router.get("/ingredients/all", listIngredients);

export default router;
