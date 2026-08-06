import type { Request, Response } from "express";
import { Pizza } from "../models/Pizza";
import { Ingredient } from "../models/Ingredient";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";

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
    pizzas.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
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
    throw new ApiError(404, "Pizza not found");
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

// Admin controllers
export const adminListPizzas = asyncHandler(async (req: Request, res: Response) => {
  const pizzas = await Pizza.find({ isCustom: false }).sort({ createdAt: -1 });
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
    orderCount: pizza.orderCount || 0,
    createdAt: pizza.createdAt,
    updatedAt: pizza.updatedAt
  }));

  sendSuccess(res, { pizzas: formattedPizzas, total: formattedPizzas.length });
});

export const adminCreatePizza = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, price, category, tags, imageUrl, ingredients, isAvailable } = req.body;

  if (!name || !price || !category) {
    throw new ApiError(400, "Name, price, and category are required");
  }

  const pizza = await Pizza.create({
    name,
    description: description || '',
    basePrice: price,
    category,
    isCustom: false,
    tags: tags || [],
    image: imageUrl || '',
    ingredients: ingredients || [],
    isAvailable: isAvailable ?? true,
    orderCount: 0
  });

  const formattedPizza = {
    _id: pizza._id.toString(),
    name: pizza.name,
    description: pizza.description,
    price: pizza.basePrice,
    category: pizza.category,
    tags: pizza.tags,
    imageUrl: pizza.image,
    ingredients: pizza.ingredients,
    isAvailable: pizza.isAvailable,
    orderCount: pizza.orderCount
  };

  sendSuccess(res, { pizza: formattedPizza }, "Pizza created successfully");
});

export const adminUpdatePizza = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, category, tags, imageUrl, ingredients, isAvailable } = req.body;

  const pizza = await Pizza.findByIdAndUpdate(
    id,
    {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price && { basePrice: price }),
      ...(category && { category }),
      ...(tags && { tags }),
      ...(imageUrl !== undefined && { image: imageUrl }),
      ...(ingredients && { ingredients }),
      ...(isAvailable !== undefined && { isAvailable }),
    },
    { new: true }
  );

  if (!pizza) {
    throw new ApiError(404, "Pizza not found");
  }

  const formattedPizza = {
    _id: pizza._id.toString(),
    name: pizza.name,
    description: pizza.description,
    price: pizza.basePrice,
    category: pizza.category,
    tags: pizza.tags,
    imageUrl: pizza.image,
    ingredients: pizza.ingredients,
    isAvailable: pizza.isAvailable,
    orderCount: pizza.orderCount
  };

  sendSuccess(res, { pizza: formattedPizza }, "Pizza updated successfully");
});

export const adminDeletePizza = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const pizza = await Pizza.findByIdAndDelete(id);

  if (!pizza) {
    throw new ApiError(404, "Pizza not found");
  }

  sendSuccess(res, {}, "Pizza deleted successfully");
});

export const adminTogglePizzaAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const pizza = await Pizza.findById(id);

  if (!pizza) {
    throw new ApiError(404, "Pizza not found");
  }

  pizza.isAvailable = !pizza.isAvailable;
  await pizza.save();

  const formattedPizza = {
    _id: pizza._id.toString(),
    name: pizza.name,
    description: pizza.description,
    price: pizza.basePrice,
    category: pizza.category,
    tags: pizza.tags,
    imageUrl: pizza.image,
    ingredients: pizza.ingredients,
    isAvailable: pizza.isAvailable,
    orderCount: pizza.orderCount
  };

  sendSuccess(res, { pizza: formattedPizza }, `Pizza ${pizza.isAvailable ? 'enabled' : 'disabled'} successfully`);
});
