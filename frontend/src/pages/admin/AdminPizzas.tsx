import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, Power, Search, X, Upload, Image as ImageIcon } from 'lucide-react';
import { pizzaApi, adminUploadApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import type { Pizza } from '@/types';

type CategoryFilter = 'All' | 'veg' | 'non-veg';
type AvailFilter = 'All' | 'available' | 'hidden';
type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'name';

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  category: 'veg' as 'veg' | 'non-veg',
  tags: '',
  imageUrl: '',
  ingredients: '',
  isAvailable: true,
};

export default function AdminPizzas() {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [viewPizza, setViewPizza] = useState<Pizza | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pizza | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toolbar state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [avail, setAvail] = useState<AvailFilter>('All');
  const [sort, setSort] = useState<SortKey>('newest');

  const toast = useToast();

  useEffect(() => { loadPizzas(); }, []);

  const loadPizzas = async () => {
    try {
      const res = await pizzaApi.adminGetAll();
      setPizzas(res.data.pizzas);
    } catch (e) {
      toast((e as Error).message || 'Failed to load pizzas', 'error');
    }
  };

  const filtered = useMemo(() => {
    let list = [...pizzas];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.ingredients.some(i => i.toLowerCase().includes(q)),
      );
    }
    if (category !== 'All') list = list.filter(p => p.category === category);
    if (avail === 'available') list = list.filter(p => p.isAvailable);
    if (avail === 'hidden') list = list.filter(p => !p.isAvailable);
    switch (sort) {
      case 'price_asc': list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    }
    return list;
  }, [pizzas, search, category, avail, sort]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) { toast('Please enter a pizza name', 'warning'); return; }
    if (formData.price < 0) { toast('Price cannot be negative', 'warning'); return; }
    setSaving(true);
    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(Boolean),
        price: Number(formData.price),
        imageUrl: formData.imageUrl,
        category: formData.category,
        isAvailable: formData.isAvailable,
      };

      if (showModal === 'create') {
        await pizzaApi.adminCreate(data);
        toast('Pizza created successfully');
      } else if (showModal === 'edit' && selectedPizza) {
        await pizzaApi.adminUpdate(selectedPizza._id, data);
        toast('Pizza updated successfully');
      }

      setShowModal(null);
      setSelectedPizza(null);
      loadPizzas();
    } catch (e) {
      toast((e as Error).message || 'Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await pizzaApi.adminToggleAvailability(id);
      loadPizzas();
    } catch (e) {
      toast((e as Error).message || 'Failed to update availability', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await pizzaApi.adminDelete(deleteTarget._id);
      toast('Pizza deleted successfully');
      setDeleteTarget(null);
      loadPizzas();
    } catch (e) {
      toast((e as Error).message || 'Failed to delete pizza', 'error');
    }
  };

  const openCreateModal = () => { setFormData(emptyForm); setShowModal('create'); };

  const openEditModal = (pizza: Pizza) => {
    setSelectedPizza(pizza);
    setFormData({
      name: pizza.name,
      description: pizza.description,
      price: pizza.price,
      category: pizza.category,
      tags: pizza.tags.join(', '),
      // Only prefill a real stored image — never the display fallback — so an
      // imageless pizza doesn't get the placeholder URL baked in on save.
      imageUrl: pizza.hasImage ? pizza.imageUrl : '',
      ingredients: pizza.ingredients.join(', '),
      isAvailable: pizza.isAvailable,
    });
    setShowModal('edit');
  };

  // Read a file from the admin's computer → base64 → upload → set imageUrl.
  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast('Image must be under 4MB', 'error'); return; }
    if (!file.type.startsWith('image/')) { toast('Please choose an image file', 'error'); return; }

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
        setFormData(p => ({ ...p, imageUrl: res.url }));
        toast('Image uploaded');
      } else {
        toast(res.message || 'Image upload failed', 'error');
      }
    } catch {
      toast('Image upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const inputCls = "w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-forno-text-primary">Pizza Management</h2>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 accent-gradient text-white rounded-button hover:brightness-110 transition-all">
          <Plus size={16} /> Add Pizza
        </button>
      </div>

      {/* Toolbar: search / filter / sort */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forno-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, description, tags..." className="pl-9 pr-8 py-2 w-full bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary"><X size={14} /></button>}
        </div>
        <select value={category} onChange={e => setCategory(e.target.value as CategoryFilter)} className="px-3 py-2 bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-secondary focus:outline-none focus:border-[#FF6B35]/50">
          <option value="All">All categories</option>
          <option value="veg">Veg</option>
          <option value="non-veg">Non-Veg</option>
        </select>
        <select value={avail} onChange={e => setAvail(e.target.value as AvailFilter)} className="px-3 py-2 bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-secondary focus:outline-none focus:border-[#FF6B35]/50">
          <option value="All">All availability</option>
          <option value="available">Available</option>
          <option value="hidden">Hidden</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="px-3 py-2 bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-secondary focus:outline-none focus:border-[#FF6B35]/50">
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="name">Name A–Z</option>
        </select>
        <span className="text-xs text-forno-text-muted ml-auto">{filtered.length} pizza{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {/* Pizza Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((pizza, i) => (
          <motion.div key={pizza._id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
            className={`glass-card p-6 relative ${!pizza.isAvailable ? 'opacity-60' : ''}`}>

            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${pizza.category === 'veg' ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}`}>{pizza.category}</span>
              <div className="flex gap-2">
                {pizza.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-forno-bg-tertiary rounded text-[10px] text-forno-text-muted">{tag}</span>
                ))}
              </div>
            </div>

            {/* Click the image to preview the pizza in a large card */}
            <button onClick={() => setViewPizza(pizza)} className="relative mb-4 rounded-lg overflow-hidden block w-full group cursor-pointer">
              <img src={pizza.imageUrl} alt={pizza.name} className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold flex items-center gap-1.5 bg-black/50 px-3 py-1.5 rounded-pill"><Eye size={13} /> View details</span>
              </div>
              {!pizza.isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-semibold flex items-center gap-1"><EyeOff size={14} /> Hidden</span>
                </div>
              )}
            </button>

            <div className="mb-4">
              <h4 className="font-semibold text-forno-text-primary mb-1">{pizza.name}</h4>
              <p className="text-sm text-forno-text-secondary line-clamp-2">{pizza.description}</p>
              <p className="text-lg font-mono font-semibold mt-2" style={{ color: '#FF6B35' }}>₹{pizza.price}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setViewPizza(pizza)} title="View details" className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-[#FF6B35] hover:border-[#FF6B35]/30 transition-all"><Eye size={14} /></button>
              <button onClick={() => handleToggle(pizza._id)} title={pizza.isAvailable ? 'Hide from menu' : 'Show on menu'} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all"><Power size={14} /></button>
              <button onClick={() => openEditModal(pizza)} title="Edit" className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all"><Edit size={14} /></button>
              <button onClick={() => setDeleteTarget(pizza)} title="Delete" className="ml-auto p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-red-500 hover:border-red-500/30 transition-all"><Trash2 size={14} /></button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-forno-text-muted">No pizzas match your filters.</div>
        )}
      </div>

      {/* ─── View / Preview modal ─── */}
      <AnimatePresence>
        {viewPizza && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setViewPizza(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="glass-card-elevated p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-forno-text-primary">Pizza Preview</h3>
                <button onClick={() => setViewPizza(null)} className="text-forno-text-muted hover:text-forno-text-primary"><X size={18} /></button>
              </div>
              <div className="relative rounded-lg overflow-hidden mb-4">
                <img src={viewPizza.imageUrl} alt={viewPizza.name} className="w-full h-56 object-cover" />
                <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${viewPizza.category === 'veg' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>{viewPizza.category}</span>
                {!viewPizza.isAvailable && <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[11px] font-semibold bg-black/70 text-white">Hidden</span>}
              </div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-semibold text-forno-text-primary">{viewPizza.name}</h4>
                  <p className="text-sm text-forno-text-secondary mt-1">{viewPizza.description || 'No description.'}</p>
                </div>
                <span className="font-mono text-xl font-semibold text-[#FF6B35] shrink-0">₹{viewPizza.price}</span>
              </div>
              {viewPizza.ingredients.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-forno-text-muted uppercase tracking-wide mb-1.5">Ingredients</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewPizza.ingredients.map(ing => <span key={ing} className="px-2 py-0.5 bg-forno-bg-tertiary rounded text-xs text-forno-text-secondary">{ing}</span>)}
                  </div>
                </div>
              )}
              {viewPizza.tags.length > 0 && (
                <p className="text-xs text-forno-text-muted mb-4">Tags: {viewPizza.tags.join(', ')}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setViewPizza(null); openEditModal(viewPizza); }} className="flex-1 py-2.5 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all"><Edit size={14} className="inline mr-1.5" />Edit Pizza</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Create/Edit Modal ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card-elevated p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-forno-text-primary mb-4">{showModal === 'create' ? 'Add New Pizza' : `Edit: ${selectedPizza?.name}`}</h3>

              {/* Image picker */}
              <div className="mb-5">
                <label className="block text-xs text-forno-text-muted mb-2">Pizza Image</label>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-24 rounded-lg overflow-hidden bg-forno-bg-tertiary flex items-center justify-center shrink-0 border border-forno-border">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Pizza preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-forno-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#FF6B35]/40 text-sm text-[#FF6B35] hover:bg-[#FF6B35]/5 cursor-pointer transition-all">
                      <Upload size={15} />
                      {uploading ? 'Uploading...' : 'Upload from computer'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />
                    </label>
                    <div className="relative">
                      <input type="text" value={formData.imageUrl} onChange={e => setFormData(p => ({ ...p, imageUrl: e.target.value }))} placeholder="...or paste an image URL" className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                      {formData.imageUrl && <button onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary"><X size={14} /></button>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className={`${inputCls} min-h-[100px]`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Price (₹)</label>
                    <input type="number" min={0} value={formData.price} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Category</label>
                    <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value as 'veg' | 'non-veg' }))} className={inputCls}>
                      <option value="veg">Veg</option>
                      <option value="non-veg">Non-Veg</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Tags (comma separated)</label>
                  <input type="text" value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="bestseller, spicy" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Ingredients (comma separated)</label>
                  <input type="text" value={formData.ingredients} onChange={e => setFormData(p => ({ ...p, ingredients: e.target.value }))} placeholder="Mozzarella, Pepperoni, Tomato Sauce" className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData(p => ({ ...p, isAvailable: e.target.checked }))} id="available" />
                  <label htmlFor="available" className="text-sm text-forno-text-secondary">Available on menu</label>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(null)} className="flex-1 py-2.5 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary transition-all">Cancel</button>
                <button onClick={handleSubmit} disabled={saving || uploading} className="flex-1 py-2.5 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete confirmation modal (not the browser default) ─── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="glass-card-elevated p-6 w-full max-w-sm text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-forno-text-primary mb-2">Delete "{deleteTarget.name}"?</h3>
              <p className="text-sm text-forno-text-secondary mb-6">This will remove the pizza from your menu permanently. This can't be undone.</p>
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
