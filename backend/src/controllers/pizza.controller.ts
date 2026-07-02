import type { Request, Response } from "express";
import { Pizza } from "../models/Pizza";
import { Ingredient } from "../models/Ingredient";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const listPizzas = asyncHandler(async (req: Request, res: Response) => {
  const { category, tag, sort, search } = req.query;

  let query: any = { isCustom: false, isAvailable: true };

  if (category) {
    query.category = category;
  }

  if (tag) {
    query.tags = tag as string;
  }

  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    query.$or = [
      { name: searchRegex },
      { description: searchRegex }
    ];
  }

  let pizzas = await Pizza.find(query);

  if (sort === 'price_asc') {
    pizzas.sort((a, b) => a.basePrice - b.basePrice);
  } else if (sort === 'price_desc') {
    pizzas.sort((a, b) => b.basePrice - a.basePrice);
  } else if (sort === 'popular') {
    pizzas.sort((a, b) => b.orderCount - a.orderCount);
  } else {
    pizzas.sort({ category: 1, name: 1 } as any);
  }

  const formattedPizzas = pizzas.map(pizza => ({
    _id: pizza._id.toString(),
    name: pizza.name,
    description: pizza.description,
    price: pizza.basePrice,
    category: pizza.category,
    tags: pizza.tags || [],
    imageUrl: pizza.image || '',
    ingredients: pizza.ingredients || [],
    isAvailable: pizza.isAvailable,
    orderCount: pizza.orderCount || 0
  }));

  sendSuccess(res, { pizzas: formattedPizzas, total: formattedPizzas.length });
});

export const getPizzaById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const pizza = await Pizza.findById(id);

  if (!pizza) {
    return res.status(404).json({ success: false, message: 'Pizza not found' });
  }

  const formattedPizza = {
    _id: pizza._id.toString(),
    name: pizza.name,
    description: pizza.description,
    price: pizza.basePrice,
    category: pizza.category,
    tags: pizza.tags || [],
    imageUrl: pizza.image || '',
    ingredients: pizza.ingredients || [],
    isAvailable: pizza.isAvailable,
    orderCount: pizza.orderCount || 0
  };

  sendSuccess(res, { pizza: formattedPizza });
});

export const listIngredients = asyncHandler(async (_req: Request, res: Response) => {
  const ingredients = await Ingredient.find({ isAvailable: true }).sort({ type: 1, name: 1 });

  const formattedIngredients = ingredients.map(ing => ({
    _id: ing._id.toString(),
    name: ing.name,
    category: ing.type,
    currentStock: ing.currentStock,
    maxCapacity: ing.maxCapacity,
    threshold: ing.lowStockThreshold,
    unitPrice: ing.price,
    isAvailable: ing.isAvailable,
    imageUrl: ing.image || ''
  }));

  const grouped = {
    bases: formattedIngredients.filter((i) => i.category === "base"),
    sauces: formattedIngredients.filter((i) => i.category === "sauce"),
    cheeses: formattedIngredients.filter((i) => i.category === "cheese"),
    vegetables: formattedIngredients.filter((i) => i.category === "vegetable"),
  };

  sendSuccess(res, { items: formattedIngredients, lowStockCount: formattedIngredients.filter(i => i.currentStock < i.threshold).length });
});
