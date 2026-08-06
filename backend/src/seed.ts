import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Admin } from "./models/Admin";
import { Ingredient } from "./models/Ingredient";
import { Pizza } from "./models/Pizza";
import { seedAdmin, seedIngredients, seedPizzas } from "./seed-data";

const MONGO_URI = process.env["MONGO_URI"] ?? "mongodb://localhost:27017/forno";

async function seed(): Promise<void> {
  // Never clobber a live database: the seed wipes pizzas/ingredients/admins.
  if (process.env["NODE_ENV"] === "production" && process.env["FORCE_SEED"] !== "true") {
    throw new Error("Refusing to seed in production. Set FORCE_SEED=true to override.");
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  await Admin.deleteMany({});
  await Ingredient.deleteMany({});
  await Pizza.deleteMany({});

  const adminPassword = seedAdmin.getPassword();
  const hashed = await bcrypt.hash(adminPassword, 12);
  await Admin.create({ name: seedAdmin.name, email: seedAdmin.email, password: hashed });
  console.log(`Admin seeded — email: ${seedAdmin.email} / password: ${process.env["ADMIN_PASSWORD"] ? "from ADMIN_PASSWORD env" : adminPassword}`);

  await Ingredient.insertMany(seedIngredients);
  console.log(`${seedIngredients.length} ingredients seeded`);

  await Pizza.insertMany(seedPizzas);
  console.log(`${seedPizzas.length} pizzas seeded`);

  console.log("Seed complete!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
