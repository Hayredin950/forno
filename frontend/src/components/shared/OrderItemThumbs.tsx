import PizzaPreview from '@/components/shared/PizzaPreview';
import { useOrderMaps, resolveIngredientName } from '@/lib/orderItems';
import type { InventoryItem, OrderItem } from '@/types';

/** Build a name-only pseudo item for PizzaPreview (it only reads `.name`). */
const pseudo = (name?: string): InventoryItem | null =>
  name ? ({ _id: '', name, category: 'base' as const } as InventoryItem) : null;

/**
 * Thumbnail(s) for the items in an order. Custom-built pizzas render the real
 * layered preview (base/sauce/cheese/veggies); catalogue pizzas show their
 * image. Falls back to a letter avatar when nothing is known about the item.
 */
export default function OrderItemThumbs({ items, size = 56 }: { items: OrderItem[]; size?: number }) {
  const maps = useOrderMaps();

  return (
    <div className="flex -space-x-2">
      {items.slice(0, 4).map((item, i) => {
        if (item.type === 'custom') {
          return (
            <div key={i} className="rounded-lg overflow-hidden ring-2 ring-forno-bg-primary shrink-0" style={{ width: size, height: size }}>
              <PizzaPreview
                base={pseudo(resolveIngredientName(item.base, maps))}
                sauce={pseudo(resolveIngredientName(item.sauce, maps))}
                cheese={pseudo(resolveIngredientName(item.cheese, maps))}
                veggies={(item.veggies ?? []).map(v => pseudo(resolveIngredientName(v, maps))!).filter(Boolean)}
                size={size}
              />
            </div>
          );
        }
        const img = maps?.pizzaMap.get(item.pizzaId ?? '');
        return (
          <div key={i} className="rounded-lg bg-forno-bg-tertiary overflow-hidden ring-2 ring-forno-bg-primary flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            {img ? (
              <img src={img} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-forno-text-muted">{item.name[0] ?? 'P'}</span>
            )}
          </div>
        );
      })}
      {items.length > 4 && (
        <div className="rounded-lg bg-forno-bg-tertiary ring-2 ring-forno-bg-primary flex items-center justify-center shrink-0 text-xs text-forno-text-muted" style={{ width: size, height: size }}>
          +{items.length - 4}
        </div>
      )}
    </div>
  );
}
