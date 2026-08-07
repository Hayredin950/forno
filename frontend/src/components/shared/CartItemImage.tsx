import type { CartItem, InventoryItem } from "@/types";
import PizzaPreview from "@/components/shared/PizzaPreview";

/** Build a name-only pseudo item for PizzaPreview (it only reads `.name`). */
const pseudo = (name?: string): InventoryItem | null =>
  name ? ({ _id: "", name, category: "base" as const } as InventoryItem) : null;

/**
 * Cart item thumbnail. For custom-built pizzas this renders the real layered
 * preview (base/sauce/cheese/veggies) instead of a generic letter avatar, so
 * the user sees exactly the pizza they built. For catalogue pizzas it shows
 * their image (or a fallback letter).
 */
export default function CartItemImage({ item, size = 64 }: { item: CartItem; size?: number }) {
  if (item.type === "custom") {
    return (
      <PizzaPreview
        base={pseudo(item.base)}
        sauce={pseudo(item.sauce)}
        cheese={pseudo(item.cheese)}
        veggies={(item.veggies ?? []).map((n) => pseudo(n)!).filter(Boolean)}
        size={size}
        className="shrink-0"
      />
    );
  }

  return (
    <div
      className="rounded-lg bg-forno-bg-tertiary flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-lg font-bold text-forno-text-muted">{item.name[0] ?? "P"}</span>
      )}
    </div>
  );
}
