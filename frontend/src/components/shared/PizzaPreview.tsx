import type { CSSProperties } from "react";
import type { InventoryItem } from "@/types";
import { ingredientImage } from "@/lib/pizzaLayers";

/**
 * Real-image pizza preview.
 *
 * Instead of drawing a flat mock, this stacks 22 pre-generated ingredient
 * layer images (5 bases + 5 sauces + 4 cheeses + 8 transparent veggie
 * cutouts) — all shot with the same top-down angle/lighting — so any of the
 * ~800 possible combinations render as a realistic pizza. Layer order:
 * base -> sauce (multiply) -> cheese -> veggie cutouts.
 *
 * Assets live in frontend/public/images/pizza-layers/ and are served at
 * /images/pizza-layers/<slug>.png by both the Vite dev server, Vercel, and
 * the backend's static /images route.
 */

interface PizzaPreviewProps {
  base?: InventoryItem | null;
  sauce?: InventoryItem | null;
  cheese?: InventoryItem | null;
  veggies?: InventoryItem[];
  size?: number;
  className?: string;
}

export default function PizzaPreview({
  base,
  sauce,
  cheese,
  veggies = [],
  size = 192,
  className = "",
}: PizzaPreviewProps) {
  const baseUrl = base ? ingredientImage(base.name) : undefined;
  const sauceUrl = sauce ? ingredientImage(sauce.name) : undefined;
  const cheeseUrl = cheese ? ingredientImage(cheese.name) : undefined;
  const veggieUrls = veggies
    .map((v) => ingredientImage(v.name))
    .filter((u): u is string => Boolean(u));

  const layerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-full border border-forno-border select-none ${className}`}
      style={{ width: size, height: size, background: "#1a1513" }}
      aria-label="Pizza preview"
    >
      {!baseUrl ? (
        <div className="absolute inset-0 flex items-center justify-center text-center px-4 text-xs text-forno-text-muted">
          Select a base to see your pizza
        </div>
      ) : (
        <>
          {baseUrl && <img src={baseUrl} alt="Pizza base" style={layerStyle} draggable={false} />}
          {sauceUrl && (
            <img
              src={sauceUrl}
              alt="Sauce"
              style={{ ...layerStyle, mixBlendMode: "multiply" }}
              draggable={false}
            />
          )}
          {cheeseUrl && <img src={cheeseUrl} alt="Cheese" style={layerStyle} draggable={false} />}
          {veggieUrls.map((u, i) => (
            <img key={`${u}-${i}`} src={u} alt="Topping" style={layerStyle} draggable={false} />
          ))}
        </>
      )}
    </div>
  );
}
