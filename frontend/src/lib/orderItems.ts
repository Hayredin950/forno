import { useEffect, useState } from 'react';
import { pizzaApi, inventoryApi } from '@/services/api';
import type { OrderItem } from '@/types';

export interface OrderImageMaps {
  pizzaMap: Map<string, string>; // pizzaId -> imageUrl
  ingMap: Map<string, string>;   // ingredientId -> display name
}

// Module-level cache so every page that renders order images shares one
// fetch of the catalogue + inventory instead of re-requesting per order.
// On failure the cache is cleared so the next mount retries.
let cache: Promise<OrderImageMaps> | null = null;

export function loadOrderMaps(): Promise<OrderImageMaps> {
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

export function useOrderMaps(): OrderImageMaps | null {
  const [maps, setMaps] = useState<OrderImageMaps | null>(null);
  useEffect(() => {
    let alive = true;
    loadOrderMaps().then(m => { if (alive) setMaps(m); });
    return () => { alive = false; };
  }, []);
  return maps;
}

/**
 * Resolve an ingredient id to its display name. While the maps are still
 * loading we return undefined rather than the raw id, so users never see
 * meaningless Mongo ObjectIds ("Custom build • 6a74b3f1… + …"). Once loaded,
 * ids fall back to their raw value — legacy orders may store names directly.
 */
export function resolveIngredientName(id: string | undefined, maps: OrderImageMaps | null): string | undefined {
  if (!id) return undefined;
  if (!maps) return undefined;
  return maps.ingMap.get(id) ?? id;
}

/**
 * Human-readable custom-build summary: "Classic Base + Marinara + Mozzarella
 * + 2 toppings". No raw ids ever leak through to the user.
 */
export function customBuildSummary(item: OrderItem, maps: OrderImageMaps | null): string {
  const parts: string[] = [];
  const base = resolveIngredientName(item.base, maps);
  const sauce = resolveIngredientName(item.sauce, maps);
  const cheese = resolveIngredientName(item.cheese, maps);
  if (base) parts.push(base);
  if (sauce) parts.push(sauce);
  if (cheese) parts.push(cheese);
  const veggies = (item.veggies ?? [])
    .map(v => resolveIngredientName(v, maps))
    .filter((v): v is string => !!v);
  if (veggies.length > 0) parts.push(`${veggies.length} topping${veggies.length === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' + ') : 'Custom build';
}
