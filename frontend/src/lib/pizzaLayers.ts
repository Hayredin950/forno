/**
 * Shared mapping between ingredient names and their generated layer-image
 * assets (frontend/public/images/pizza-layers/<slug>.png).
 *
 * Used by the custom-pizza Builder to (a) render the live stacked preview and
 * (b) show a real thumbnail of each ingredient in the choice list instead of a
 * letter avatar.
 */

const LAYER_SLUGS: Record<string, string> = {
  // Bases
  "classic hand tossed": "classic-hand-tossed",
  "thin crust": "thin-crust",
  "cheese burst": "cheese-burst",
  "whole wheat": "whole-wheat",
  "gluten free": "gluten-free",
  // Sauces
  "classic tomato": "classic-tomato",
  "bbq sauce": "bbq",
  "white garlic": "white-garlic",
  "pesto": "pesto",
  "spicy arrabbiata": "spicy-arrabbiata",
  // Cheeses
  "mozzarella": "mozzarella",
  "cheddar": "cheddar",
  "four cheese blend": "four-cheese-blend",
  "vegan cheese": "vegan-cheese",
  // Veggies
  "bell peppers": "bell-peppers",
  "mushrooms": "mushrooms",
  "onions": "onions",
  "olives": "olives",
  "tomatoes": "tomatoes",
  "jalapeños": "jalapenos",
  "spinach": "spinach",
  "sweet corn": "sweet-corn",
};

/** Given an ingredient display name, return its layer asset slug (or undefined). */
export function ingredientSlug(name: string): string | undefined {
  return LAYER_SLUGS[name.trim().toLowerCase()];
}

/** Given an ingredient display name, return the URL of its thumbnail image. */
export function ingredientImage(name: string): string | undefined {
  const slug = ingredientSlug(name);
  return slug ? `${import.meta.env.BASE_URL}images/pizza-layers/${slug}.png` : undefined;
}
