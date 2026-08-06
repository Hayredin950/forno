import bcrypt from "bcrypt";
import { Admin } from "../models/Admin";
import { Ingredient } from "../models/Ingredient";
import { Pizza } from "../models/Pizza";
import { logger } from "../lib/logger";
import { seedAdmin, seedIngredients, seedPizzas } from "../seed-data";

/**
 * Auto-seed on boot when the database is brand new.
 *
 * Unlike the manual `npm run seed` (which wipes everything and requires
 * FORCE_SEED=true in production), this is safe by construction: it only
 * inserts the starter pizzas/ingredients/admin when the matching collection
 * is empty, so existing data is never touched.
 */
export async function autoSeedIfEmpty(): Promise<void> {
  try {
    const [pizzaCount, ingredientCount, adminCount] = await Promise.all([
      Pizza.estimatedDocumentCount(),
      Ingredient.estimatedDocumentCount(),
      Admin.estimatedDocumentCount(),
    ]);

    if (pizzaCount > 0 && ingredientCount > 0) {
      return;
    }

    logger.info({} as never, "Database is empty — seeding starter data…");

    if (pizzaCount === 0) {
      await Pizza.insertMany(seedPizzas);
    }
    if (ingredientCount === 0) {
      await Ingredient.insertMany(seedIngredients);
    }
    if (adminCount === 0) {
      const hashed = await bcrypt.hash(seedAdmin.getPassword(), 12);
      await Admin.create({ name: seedAdmin.name, email: seedAdmin.email, password: hashed });
    }

    logger.info({} as never, `Seeded ${seedPizzas.length} pizzas, ${seedIngredients.length} ingredients, and admin account`);
  } catch (err) {
    logger.info({} as never, `Auto-seed skipped: ${(err as Error).message}`);
  }
}