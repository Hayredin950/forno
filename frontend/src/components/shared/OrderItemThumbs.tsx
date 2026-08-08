import { useEffect, useState } from 'react';
import PizzaPreview from '@/components/shared/PizzaPreview';
import { pizzaApi, inventoryApi } from '@/services/api';
import type { InventoryItem, OrderItem } from '@/types';

/** Build a name-only pseudo item for PizzaPreview (it only reads `.name`). */
const pseudo = (name?: string): InventoryItem | null =>
  name ? ({ _id: '', name, category: 'base' as const } as InventoryItem) : null;

interface ImageMaps {
  pizzaMap: Map<string, string>;   // pizzaId -> imageUrl
  ingMap: Map<string, string>;     // ingredientId -> display name
}

// Module-level cache so every page that renders order images shares one
// fetch of the catalogue + inventory instead of re-requesting per order.
// On failure the cache is cleared so the next mount retries.
let cache: Promise<ImageMaps> | null = null;
function loadMaps(): Promise<ImageMaps> {
  if (!cache) {
    cache = Promise.all([
      pizzaApi.getAll({}).then(r => r.data.pizzas),
      inventoryApi.getNamesById(),
    ])
      .then(([pizzas, ingMap]) => ({
        pizzaMap: new Map(pizzas.map(p => [p._id, p.imageUrl ?? ''])),
        ingMap,
      }))
      .catch(() => {
        cache = null;
        return { pizzaMap: new Map(), ingMap: new Map() };
      });
  }
  return cache;
}

/**
 * Thumbnail(s) for the items in an order. Custom-built pizzas render the real
 * layered preview (base/sauce/cheese/veggies); catalogue pizzas show their
 * image. Falls back to a letter avatar when nothing is known about the item.
 */
export default function OrderItemThumbs({ items, size = 56 }: { items: OrderItem[]; size?: number }) {
  const [maps, setMaps] = useState<ImageMaps | null>(null);

  useEffect(() => {
    let alive = true;
    loadMaps().then(m => { if (alive) setMaps(m); });
    return () => { alive = false; };
  }, []);

  const resolveIngredient = (id?: string): string | undefined => {
    if (!id) return undefined;
    if (!maps) return undefined;
    const byId = maps.ingMap.get(id);
    if (byId) return byId;
    // Backend may store display names instead of ids on older orders.
    return id;
  };

  return (
    <div className="flex -space-x-2">
      {items.slice(0, 4).map((item, i) => {
        if (item.type === 'custom') {
          return (
            <div key={i} className="rounded-lg overflow-hidden ring-2 ring-forno-bg-primary shrink-0" style={{ width: size, height: size }}>
              <PizzaPreview
                base={pseudo(resolveIngredient(item.base))}
                sauce={pseudo(resolveIngredient(item.sauce))}
                cheese={pseudo(resolveIngredient(item.cheese))}
                veggies={(item.veggies ?? []).map(v => pseudo(resolveIngredient(v))!).filter(Boolean)}
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
