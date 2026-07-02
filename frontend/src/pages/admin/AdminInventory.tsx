import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import type { InventoryItem } from '@/types';

const categories = ['All', 'base', 'sauce', 'cheese', 'vegetable'];

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [updateModal, setUpdateModal] = useState<{ item: InventoryItem; stock: number; threshold: number } | null>(null);
  const toast = useToast();

  useEffect(() => { loadItems(); }, [activeCategory]);

  const loadItems = async () => {
    const res = await inventoryApi.getAll(activeCategory === 'All' ? {} : { category: activeCategory });
    setItems(res.data.items);
  };

  const handleAdjust = async (id: string, amount: number) => {
    await inventoryApi.adjust(id, amount);
    loadItems();
  };

  const handleUpdate = async () => {
    if (!updateModal) return;
    await inventoryApi.update(updateModal.item._id, { currentStock: updateModal.stock, threshold: updateModal.threshold });
    setUpdateModal(null);
    loadItems();
    toast('Stock updated successfully');
  };

  const filteredItems = items;

  return (
    <div>
      {/* Category Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === c ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30' : 'bg-forno-bg-tertiary text-forno-text-secondary border border-forno-border'
            }`}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredItems.map((item, i) => {
          const pct = (item.currentStock / item.maxCapacity) * 100;
          const isLow = item.currentStock < item.threshold;
          const isCritical = item.currentStock < 10;
          const ringColor = pct >= 50 ? '#FF6B35' : pct >= 25 ? '#F9A825' : '#E53935';
          const circumference = 2 * Math.PI * 40;
          const offset = circumference - (pct / 100) * circumference;

          return (
            <motion.div key={item._id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className={`glass-card p-6 relative ${isLow ? 'border-l-[3px]' : ''}`} style={isLow ? { borderLeftColor: '#E53935' } : {}}>
              {isLow && (
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute top-4 right-4">
                  <AlertTriangle size={14} className="text-forno-accent-red" />
                </motion.div>
              )}

              <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-0.5 bg-forno-bg-tertiary rounded text-[11px] text-forno-text-muted uppercase">{item.category}</span>
                {isLow && <span className="px-2 py-0.5 bg-forno-accent-red/15 text-forno-accent-red rounded text-[10px] font-semibold uppercase">Low Stock</span>}
              </div>

              <h4 className="font-semibold text-forno-text-primary mb-4">{item.name}</h4>

              {/* Progress Ring */}
              <div className="flex items-center gap-6 mb-4">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#1E1A15" strokeWidth="8" />
                    <motion.circle cx="50" cy="50" r="40" fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-mono font-semibold" style={{ color: ringColor }}>{Math.round(pct)}%</span>
                    <span className="text-[10px] text-forno-text-muted">Stock</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-forno-text-secondary">{item.currentStock} / {item.maxCapacity}</span>
                  </div>
                  <div className="h-1 bg-forno-bg-tertiary rounded-full overflow-hidden mb-2">
                    <motion.div className="h-full rounded-full" style={{ background: ringColor }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                  </div>
                  <p className="text-xs text-forno-text-muted">Alert at: {item.threshold} units</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={() => handleAdjust(item._id, -1)} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all">
                  <Minus size={14} />
                </button>
                <span className="flex-1 text-center font-mono text-sm text-forno-text-primary">{item.currentStock}</span>
                <button onClick={() => handleAdjust(item._id, 1)} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all">
                  <Plus size={14} />
                </button>
                <button onClick={() => setUpdateModal({ item, stock: item.currentStock, threshold: item.threshold })}
                  className="ml-2 px-3 py-2 text-xs text-forno-text-secondary border border-forno-border rounded-lg hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all">
                  Update
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Update Modal */}
      <AnimatePresence>
        {updateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card-elevated p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-forno-text-primary mb-4">Update Stock</h3>
              <p className="text-sm text-forno-text-secondary mb-4">{updateModal.item.name}</p>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Current Stock</label>
                  <input type="number" value={updateModal.stock} onChange={e => setUpdateModal(p => p ? { ...p, stock: parseInt(e.target.value) || 0 } : null)}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Alert Threshold</label>
                  <input type="number" value={updateModal.threshold} onChange={e => setUpdateModal(p => p ? { ...p, threshold: parseInt(e.target.value) || 0 } : null)}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setUpdateModal(null)} className="flex-1 py-2.5 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary transition-all">Cancel</button>
                <button onClick={handleUpdate} className="flex-1 py-2.5 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
