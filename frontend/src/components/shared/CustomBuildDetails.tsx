import { useOrderMaps, resolveIngredientName } from '@/lib/orderItems';
import type { OrderItem } from '@/types';

/**
 * The full breakdown of a custom-built pizza: four numbered rows — 1 Base,
 * 2 Sauce, 3 Cheese, 4 Veggies — with every ingredient name, wrapping onto as
 * many lines as needed so nothing is hidden. The pizza thumbnail is rendered
 * separately by the calling page (OrderItemThumbs), so no duplicate image here.
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
  ];

  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] text-[10px] font-bold shrink-0">{row.num}</span>
          <span className="w-14 text-[11px] uppercase tracking-wide text-forno-text-muted shrink-0">{row.label}</span>
          <span className="text-sm text-forno-text-primary min-w-0">{row.value || '—'}</span>
        </div>
      ))}
      {/* Veggies wrap as chips so none are ever cut off */}
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FF6B35]/15 text-[#FF6B35] text-[10px] font-bold shrink-0 mt-0.5">4</span>
        <span className="w-14 text-[11px] uppercase tracking-wide text-forno-text-muted shrink-0 pt-0.5">Veggies</span>
        <div className="flex flex-wrap gap-1.5 min-w-0">
          {veggies.length > 0 ? (
            veggies.map(v => (
              <span key={v} className="px-2 py-0.5 bg-forno-bg-tertiary border border-forno-border rounded text-xs text-forno-text-primary">
                {v}
              </span>
            ))
          ) : (
            <span className="text-sm text-forno-text-primary">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
