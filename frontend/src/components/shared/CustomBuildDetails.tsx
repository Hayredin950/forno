import PizzaPreview from '@/components/shared/PizzaPreview';
import { useOrderMaps, resolveIngredientName } from '@/lib/orderItems';
import type { InventoryItem, OrderItem } from '@/types';

const pseudo = (name?: string): InventoryItem | null =>
  name ? ({ _id: '', name, category: 'base' as const } as InventoryItem) : null;

/**
 * The full breakdown of a custom-built pizza: the layered preview image on the
 * left and four numbered cards — 1 Base, 2 Sauce, 3 Cheese, 4 Veggies — with
 * the real ingredient names. Used in the admin order detail and the user's
 * tracking page so kitchen staff and customers see exactly what was ordered.
 */
export default function CustomBuildDetails({ item }: { item: OrderItem }) {
  const maps = useOrderMaps();
  const veggies = (item.veggies ?? [])
    .map(v => resolveIngredientName(v, maps))
    .filter((v): v is string => !!v);

  const rows = [
    { num: '1', label: 'Base', value: resolveIngredientName(item.base, maps) },
    { num: '2', label: 'Sauce', value: resolveIngredientName(item.sauce, maps) },
    { num: '3', label: 'Cheese', value: resolveIngredientName(item.cheese, maps) },
    { num: '4', label: 'Veggies', value: veggies.join(', ') },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="rounded-xl overflow-hidden bg-forno-bg-tertiary border border-forno-border shrink-0 self-center sm:self-start">
        <PizzaPreview
          base={pseudo(resolveIngredientName(item.base, maps))}
          sauce={pseudo(resolveIngredientName(item.sauce, maps))}
          cheese={pseudo(resolveIngredientName(item.cheese, maps))}
          veggies={(item.veggies ?? []).map(v => pseudo(resolveIngredientName(v, maps))!).filter(Boolean)}
          size={120}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
        {rows.map(row => (
          <div key={row.label} className="bg-forno-bg-tertiary/60 border border-forno-border rounded-lg px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-forno-text-muted mb-0.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] text-[9px] font-bold mr-1.5">{row.num}</span>
              {row.label}
            </p>
            <p className="text-sm text-forno-text-primary truncate" title={row.value}>
              {row.value || '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
