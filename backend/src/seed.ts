import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Admin } from "./models/Admin";
import { Ingredient } from "./models/Ingredient";
import { Pizza } from "./models/Pizza";

const MONGO_URI = process.env["MONGO_URI"] ?? "mongodb://localhost:27017/forno";

const ingredients = [
  { type: "base", name: "Classic Hand Tossed", image: "", currentStock: 45, maxCapacity: 50, lowStockThreshold: 20, unit: "units", price: 0, isAvailable: true },
  { type: "base", name: "Thin Crust", image: "", currentStock: 8, maxCapacity: 50, lowStockThreshold: 20, unit: "units", price: 20, isAvailable: true },
  { type: "base", name: "Cheese Burst", image: "", currentStock: 32, maxCapacity: 50, lowStockThreshold: 20, unit: "units", price: 50, isAvailable: true },
  { type: "base", name: "Whole Wheat", image: "", currentStock: 28, maxCapacity: 50, lowStockThreshold: 20, unit: "units", price: 30, isAvailable: true },
  { type: "base", name: "Gluten Free", image: "", currentStock: 15, maxCapacity: 50, lowStockThreshold: 20, unit: "units", price: 40, isAvailable: true },
  { type: "sauce", name: "Classic Tomato", image: "", currentStock: 40, maxCapacity: 50, lowStockThreshold: 15, unit: "portions", price: 0, isAvailable: true },
  { type: "sauce", name: "BBQ Sauce", image: "", currentStock: 12, maxCapacity: 50, lowStockThreshold: 15, unit: "portions", price: 20, isAvailable: true },
  { type: "sauce", name: "White Garlic", image: "", currentStock: 35, maxCapacity: 50, lowStockThreshold: 15, unit: "portions", price: 20, isAvailable: true },
  { type: "sauce", name: "Pesto", image: "", currentStock: 22, maxCapacity: 50, lowStockThreshold: 15, unit: "portions", price: 30, isAvailable: true },
  { type: "sauce", name: "Spicy Arrabbiata", image: "", currentStock: 18, maxCapacity: 50, lowStockThreshold: 15, unit: "portions", price: 15, isAvailable: true },
  { type: "cheese", name: "Mozzarella", image: "", currentStock: 15, maxCapacity: 50, lowStockThreshold: 25, unit: "portions", price: 0, isAvailable: true },
  { type: "cheese", name: "Cheddar", image: "", currentStock: 30, maxCapacity: 50, lowStockThreshold: 25, unit: "portions", price: 20, isAvailable: true },
  { type: "cheese", name: "Four Cheese Blend", image: "", currentStock: 25, maxCapacity: 50, lowStockThreshold: 25, unit: "portions", price: 50, isAvailable: true },
  { type: "cheese", name: "Vegan Cheese", image: "", currentStock: 10, maxCapacity: 50, lowStockThreshold: 25, unit: "portions", price: 40, isAvailable: true },
  { type: "vegetable", name: "Bell Peppers", image: "", currentStock: 38, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 25, isAvailable: true },
  { type: "vegetable", name: "Mushrooms", image: "", currentStock: 18, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 30, isAvailable: true },
  { type: "vegetable", name: "Onions", image: "", currentStock: 42, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 15, isAvailable: true },
  { type: "vegetable", name: "Olives", image: "", currentStock: 35, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 25, isAvailable: true },
  { type: "vegetable", name: "Tomatoes", image: "", currentStock: 40, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 20, isAvailable: true },
  { type: "vegetable", name: "Jalapeños", image: "", currentStock: 5, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 20, isAvailable: true },
  { type: "vegetable", name: "Spinach", image: "", currentStock: 30, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 25, isAvailable: true },
  { type: "vegetable", name: "Sweet Corn", image: "", currentStock: 28, maxCapacity: 50, lowStockThreshold: 10, unit: "portions", price: 20, isAvailable: true },
];

const pizzas = [
  { name: "Margherita Classica", image: "", description: "San Marzano tomatoes, fresh mozzarella, basil", basePrice: 299, category: "veg", isCustom: false, tags: ["bestseller"], ingredients: ["Tomato Sauce", "Mozzarella", "Fresh Basil"], isAvailable: true, orderCount: 342 },
  { name: "Pepperoni Fire", image: "", description: "Double pepperoni, mozzarella, chili flakes", basePrice: 399, category: "non-veg", isCustom: false, tags: ["spicy"], ingredients: ["Tomato Sauce", "Mozzarella", "Double Pepperoni", "Chili Flakes"], isAvailable: true, orderCount: 287 },
  { name: "BBQ Chicken", image: "", description: "Grilled chicken, BBQ sauce, red onions, cilantro", basePrice: 449, category: "non-veg", isCustom: false, tags: [], ingredients: ["BBQ Sauce", "Mozzarella", "Grilled Chicken", "Red Onion", "Cilantro"], isAvailable: true, orderCount: 198 },
  { name: "Veggie Supreme", image: "", description: "Bell peppers, olives, onions, tomatoes, corn", basePrice: 349, category: "veg", isCustom: false, tags: [], ingredients: ["Tomato Sauce", "Mozzarella", "Bell Peppers", "Olives", "Onions", "Tomatoes", "Corn"], isAvailable: true, orderCount: 156 },
  { name: "Four Cheese", image: "", description: "Mozzarella, cheddar, parmesan, gorgonzola", basePrice: 429, category: "veg", isCustom: false, tags: [], ingredients: ["White Sauce", "Mozzarella", "Cheddar", "Parmesan", "Gorgonzola"], isAvailable: true, orderCount: 134 },
  { name: "Truffle Mushroom", image: "", description: "Truffle oil, wild mushrooms, mozzarella, thyme", basePrice: 499, category: "veg", isCustom: false, tags: ["bestseller"], ingredients: ["White Sauce", "Mozzarella", "Wild Mushrooms", "Truffle Oil", "Thyme"], isAvailable: true, orderCount: 89 },
  { name: "Hawaiian Paradise", image: "", description: "Ham, pineapple, mozzarella, tomato sauce", basePrice: 379, category: "non-veg", isCustom: false, tags: [], ingredients: ["Tomato Sauce", "Mozzarella", "Ham", "Pineapple"], isAvailable: true, orderCount: 112 },
  { name: "Mediterranean", image: "", description: "Feta, olives, sun-dried tomatoes, spinach", basePrice: 389, category: "veg", isCustom: false, tags: [], ingredients: ["Pesto Sauce", "Mozzarella", "Feta", "Olives", "Sun-dried Tomatoes", "Spinach"], isAvailable: true, orderCount: 76 },
  { name: "Meat Lovers", image: "", description: "Pepperoni, sausage, bacon, ham, mozzarella", basePrice: 479, category: "non-veg", isCustom: false, tags: ["spicy"], ingredients: ["Tomato Sauce", "Mozzarella", "Pepperoni", "Sausage", "Bacon", "Ham"], isAvailable: true, orderCount: 201 },
  { name: "Spinach & Feta", image: "", description: "Fresh spinach, feta cheese, garlic, olive oil", basePrice: 359, category: "veg", isCustom: false, tags: [], ingredients: ["White Sauce", "Mozzarella", "Spinach", "Feta", "Garlic"], isAvailable: true, orderCount: 95 },
  { name: "Buffalo Chicken", image: "", description: "Buffalo sauce, chicken, ranch drizzle, celery", basePrice: 419, category: "non-veg", isCustom: false, tags: ["spicy"], ingredients: ["Buffalo Sauce", "Mozzarella", "Chicken", "Ranch Drizzle"], isAvailable: true, orderCount: 67 },
  { name: "Prosciutto & Arugula", image: "", description: "Prosciutto, fresh arugula, parmesan, olive oil", basePrice: 459, category: "non-veg", isCustom: false, tags: [], ingredients: ["White Sauce", "Mozzarella", "Prosciutto", "Arugula", "Parmesan"], isAvailable: true, orderCount: 54 },
];

async function seed(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  await Admin.deleteMany({});
  await Ingredient.deleteMany({});
  await Pizza.deleteMany({});

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  await Admin.create({ name: "Forno Admin", email: "admin@forno.com", password: adminPassword });
  console.log("Admin seeded — email: admin@forno.com / password: Admin@123");

  await Ingredient.insertMany(ingredients);
  console.log(`${ingredients.length} ingredients seeded`);

  await Pizza.insertMany(pizzas);
  console.log(`${pizzas.length} pizzas seeded`);

  console.log("Seed complete!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
