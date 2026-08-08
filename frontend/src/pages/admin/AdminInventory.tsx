import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, AlertTriangle, Trash2, PackagePlus, Search, X, Upload, Image as ImageIcon, Pencil } from 'lucide-react';
import { inventoryApi, adminUploadApi } from '@/services/api';
import { ingredientImage } from '@/lib/pizzaLayers';
import { useToast } from '@/components/shared/Toaster';
import type { InventoryItem } from '@/types';

const categories = ['All', 'base', 'sauce', 'cheese', 'veggies'];
const stockLevels = ['All', 'Low', 'Medium', 'High'] as const;
type StockLevel = (typeof stockLevels)[number];
type SortKey = 'name' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc';

const stockLevelOf = (item: InventoryItem): StockLevel => {
  const pct = (item.currentStock / Math.max(1, item.maxCapacity)) * 100;
  if (item.currentStock < item.threshold) return 'Low';
  if (pct >= 75) return 'High';
  if (pct >= 25) return 'Medium';
  return 'Low';
};

const emptyNewItem = { type: 'vegetable' as string, name: '', unit: 'portions', price: 0, currentStock: 20, maxCapacity: 50, lowStockThreshold: 10, image: '' };

// Module scope (not inside the component) so React keeps its identity stable
// across re-renders — an inline component definition would remount on every
// keystroke and the URL input would lose focus.
function ImagePicker({ value, uploading, onFile, onUrl, onClear }: {
  value: string;
  uploading: boolean;
  onFile: (f: File | undefined) => void;
  onUrl: (url: string) => void;
  onClear: () => void;
}) {
  const inputCls = "w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50";
  return (
    <div className="flex items-start gap-4">
      <div className="w-24 h-20 rounded-lg overflow-hidden bg-forno-bg-tertiary flex items-center justify-center shrink-0 border border-forno-border">
        {value ? <img src={value} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-forno-text-muted" />}
      </div>
      <div className="flex-1 space-y-2">
        <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[#FF6B35]/40 text-sm text-[#FF6B35] hover:bg-[#FF6B35]/5 cursor-pointer transition-all">
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload from computer'}
          <input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
        </label>
        <div className="relative">
          <input type="text" value={value} onChange={e => onUrl(e.target.value)} placeholder="...or paste an image URL" className={inputCls} />
          {value && <button onClick={onClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary"><X size={14} /></button>}
        </div>
      </div>
    </div>
  );
}

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  // The notification bell / sidebar alert deep-link here with ?stock=low so
  // the page opens already filtered to the items that need attention.
  const [stockLevel, setStockLevel] = useState<StockLevel>(() => (searchParams.get('stock') === 'low' ? 'Low' : 'All'));
  const [sort, setSort] = useState<SortKey>('name');
  const [updateModal, setUpdateModal] = useState<{ item: InventoryItem; stock: number; threshold: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', unit: '', price: 0, image: '' });
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState(emptyNewItem);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { loadItems(); }, [activeCategory]);

  // Deep-link support: the notification bell / sidebar alert link here with
  // ?stock=low. The effect (not just the useState initializer) catches
  // same-route navigation, where the component doesn't remount.
  useEffect(() => {
    if (searchParams.get('stock') === 'low') setStockLevel('Low');
  }, [searchParams]);

  const loadItems = async () => {
    try {
      const res = await inventoryApi.getAll(activeCategory === 'All' ? {} : { category: activeCategory });
      setItems(res.data.items);
    } catch (e) {
      toast((e as Error).message || 'Failed to load inventory', 'error');
    }
  };

  const filteredItems = useMemo(() => {
    let list = items;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q));
    if (stockLevel !== 'All') list = list.filter(i => stockLevelOf(i) === stockLevel);
    const sorted = [...list];
    switch (sort) {
      case 'stock_asc': sorted.sort((a, b) => a.currentStock - b.currentStock); break;
      case 'stock_desc': sorted.sort((a, b) => b.currentStock - a.currentStock); break;
      case 'price_asc': sorted.sort((a, b) => a.unitPrice - b.unitPrice); break;
      case 'price_desc': sorted.sort((a, b) => b.unitPrice - a.unitPrice); break;
      default: sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [items, search, stockLevel, sort]);

  const handleAdjust = async (id: string, amount: number) => {
    try {
      await inventoryApi.adjust(id, amount);
      loadItems();
    } catch (e) {
      toast((e as Error).message || 'Failed to update stock', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!updateModal) return;
    try {
      await inventoryApi.update(updateModal.item._id, { currentStock: updateModal.stock, threshold: updateModal.threshold });
      setUpdateModal(null);
      loadItems();
      toast('Stock updated successfully');
    } catch (e) {
      toast((e as Error).message || 'Failed to update stock', 'error');
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditTarget(item);
    setEditForm({ name: item.name, unit: item.unit ?? '', price: item.unitPrice ?? 0, image: item.imageUrl ?? '' });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    if (!editForm.name.trim()) { toast('Name cannot be empty', 'warning'); return; }
    setSaving(true);
    try {
      const res = await inventoryApi.updateDetails(editTarget._id, {
        name: editForm.name.trim(),
        unit: editForm.unit.trim() || undefined,
        price: editForm.price,
        image: editForm.image,
      });
      toast(res.message || 'Ingredient updated', res.success ? 'success' : 'error');
      if (res.success) {
        setEditTarget(null);
        loadItems();
      }
    } catch {
      toast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.name.trim()) { toast('Please enter a name', 'warning'); return; }
    setSaving(true);
    try {
      const res = await inventoryApi.create({ ...newItem, image: newItem.image || undefined });
      if (res.success) {
        toast('Ingredient added to inventory');
        setCreateOpen(false);
        setNewItem(emptyNewItem);
        loadItems();
      } else {
        toast(res.message || 'Failed to add ingredient', 'error');
      }
    } catch {
      toast('Something went wrong', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await inventoryApi.remove(deleteTarget._id);
      toast(res.message || 'Ingredient deleted');
      setDeleteTarget(null);
      loadItems();
    } catch (e) {
      toast((e as Error).message || 'Something went wrong', 'error');
    }
  };

  // Upload a file from the admin's computer and return the stored URL.
  const uploadFile = async (file: File | undefined): Promise<string | null> => {
    if (!file) return null;
    if (file.size > 4 * 1024 * 1024) { toast('Image must be under 4MB', 'error'); return null; }
    if (!file.type.startsWith('image/')) { toast('Please choose an image file', 'error'); return null; }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const res = await adminUploadApi.upload(dataUrl);
      if (res.success && res.url) {
        toast('Image uploaded');
        return res.url;
      }
      toast(res.message || 'Image upload failed', 'error');
      return null;
    } catch {
      toast('Image upload failed', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateImage = async (file: File | undefined) => {
    const url = await uploadFile(file);
    if (url) setNewItem(p => ({ ...p, image: url }));
  };

  const handleEditImage = async (file: File | undefined) => {
    const url = await uploadFile(file);
    if (url) setEditForm(p => ({ ...p, image: url }));
  };

  const inputCls = "w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-forno-text-primary">Inventory Management</h2>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 accent-gradient text-white rounded-button hover:brightness-110 transition-all">
          <PackagePlus size={16} /> Add Ingredient
        </button>
      </div>

      {/* Filters: category pills + stock level + sort + search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)}
              className={`px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === c ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30' : 'bg-forno-bg-tertiary text-forno-text-secondary border border-forno-border'
              }`}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {stockLevels.map(l => (
            <button key={l} onClick={() => setStockLevel(l)}
              className={`px-3 py-2 rounded-pill text-xs font-medium transition-all ${
                stockLevel === l ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30' : 'bg-forno-bg-tertiary text-forno-text-secondary border border-forno-border'
              }`}>
              {l === 'All' ? 'All levels' : `${l} stock`}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
          className="px-3 py-2 bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-secondary focus:outline-none focus:border-[#FF6B35]/50">
          <option value="name">Sort: Name</option>
          <option value="stock_asc">Stock: low → high</option>
          <option value="stock_desc">Stock: high → low</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
        <div className="relative ml-auto min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forno-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..."
            className="pl-9 pr-8 py-2 w-full bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary"><X size={14} /></button>}
        </div>
        <span className="text-xs text-forno-text-muted">{filteredItems.length} ingredient{filteredItems.length === 1 ? '' : 's'}</span>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredItems.map((item, i) => {
          const pct = (item.currentStock / Math.max(1, item.maxCapacity)) * 100;
          const isLow = item.currentStock < item.threshold;
          const ringColor = pct >= 50 ? '#FF6B35' : pct >= 25 ? '#F9A825' : '#E53935';
          const circumference = 2 * Math.PI * 40;
          const offset = circumference - (pct / 100) * circumference;
          const img = item.imageUrl || ingredientImage(item.name);

          return (
            <motion.div key={item._id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
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

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-forno-bg-tertiary flex items-center justify-center shrink-0 border border-forno-border">
                  {img ? (
                    <img src={img} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-forno-text-muted">{item.name[0] ?? 'I'}</span>
                  )}
                </div>
                <h4 className="font-semibold text-forno-text-primary leading-tight">{item.name}</h4>
              </div>

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
                <button onClick={() => handleAdjust(item._id, -1)} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all"><Minus size={14} /></button>
                <span className="flex-1 text-center font-mono text-sm text-forno-text-primary">{item.currentStock}</span>
                <button onClick={() => handleAdjust(item._id, 1)} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all"><Plus size={14} /></button>
                <button onClick={() => setUpdateModal({ item, stock: item.currentStock, threshold: item.threshold })}
                  className="ml-2 px-3 py-2 text-xs text-forno-text-secondary border border-forno-border rounded-lg hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all">Stock</button>
                <button onClick={() => openEdit(item)} title="Edit details & image"
                  className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-[#FF6B35] hover:border-[#FF6B35]/30 transition-all"><Pencil size={14} /></button>
                <button onClick={() => setDeleteTarget(item)} title="Delete ingredient"
                  className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-red-500 hover:border-red-500/30 transition-all"><Trash2 size={14} /></button>
              </div>
            </motion.div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-16 text-forno-text-muted">No ingredients match your filters.</div>
        )}
      </div>

      {/* Create Ingredient Modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card-elevated p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-forno-text-primary mb-4">Add New Ingredient</h3>

              <div className="mb-5">
                <label className="block text-xs text-forno-text-muted mb-2">Ingredient Image</label>
                <ImagePicker value={newItem.image} uploading={uploading} onFile={handleCreateImage} onUrl={url => setNewItem(p => ({ ...p, image: url }))} onClear={() => setNewItem(p => ({ ...p, image: '' }))} />
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Type</label>
                  <select value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                    <option value="base">Base</option>
                    <option value="sauce">Sauce</option>
                    <option value="cheese">Cheese</option>
                    <option value="vegetable">Vegetable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Name</label>
                  <input type="text" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="e.g. Bacon Bits" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Unit</label>
                    <input type="text" value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} className={inputCls} placeholder="portions" />
                  </div>
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Price (₹)</label>
                    <input type="number" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: Number(e.target.value) }))} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Stock</label>
                    <input type="number" value={newItem.currentStock} onChange={e => setNewItem(p => ({ ...p, currentStock: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Max</label>
                    <input type="number" value={newItem.maxCapacity} onChange={e => setNewItem(p => ({ ...p, maxCapacity: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Alert at</label>
                    <input type="number" value={newItem.lowStockThreshold} onChange={e => setNewItem(p => ({ ...p, lowStockThreshold: Number(e.target.value) }))} className={inputCls} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCreateOpen(false)} className="flex-1 py-2.5 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary transition-all">Cancel</button>
                <button onClick={handleCreate} disabled={saving || uploading} className="flex-1 py-2.5 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all disabled:opacity-60">
                  {saving ? 'Adding...' : 'Add Ingredient'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Ingredient Modal */}
      <AnimatePresence>
        {editTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card-elevated p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-forno-text-primary mb-4">Edit: {editTarget.name}</h3>

              <div className="mb-5">
                <label className="block text-xs text-forno-text-muted mb-2">Ingredient Image</label>
                <ImagePicker value={editForm.image} uploading={uploading} onFile={handleEditImage} onUrl={url => setEditForm(p => ({ ...p, image: url }))} onClear={() => setEditForm(p => ({ ...p, image: '' }))} />
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Unit</label>
                    <input type="text" value={editForm.unit} onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))} className={inputCls} placeholder="portions" />
                  </div>
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Price (₹)</label>
                    <input type="number" min={0} value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: Number(e.target.value) }))} className={inputCls} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditTarget(null)} className="flex-1 py-2.5 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary transition-all">Cancel</button>
                <button onClick={handleEditSave} disabled={saving || uploading} className="flex-1 py-2.5 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Stock Modal */}
      <AnimatePresence>
        {updateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card-elevated p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-forno-text-primary mb-4">Update Stock</h3>
              <p className="text-sm text-forno-text-secondary mb-4">{updateModal.item.name}</p>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Current Stock</label>
                  <input type="number" value={updateModal.stock} onChange={e => setUpdateModal(p => p ? { ...p, stock: parseInt(e.target.value) || 0 } : null)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Alert Threshold</label>
                  <input type="number" value={updateModal.threshold} onChange={e => setUpdateModal(p => p ? { ...p, threshold: parseInt(e.target.value) || 0 } : null)} className={inputCls} />
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

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="glass-card-elevated p-6 w-full max-w-sm text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-forno-text-primary mb-2">Delete "{deleteTarget.name}"?</h3>
              <p className="text-sm text-forno-text-secondary mb-6">This removes the ingredient from inventory and the builder. This can't be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary transition-all">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2.5 text-sm font-medium bg-red-500 text-white rounded-button hover:bg-red-600 transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
