import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, EyeOff, Eye } from 'lucide-react';
import { pizzaApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import type { Pizza } from '@/types';

export default function AdminPizzas() {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [selectedPizza, setSelectedPizza] = useState<Pizza | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'veg' as 'veg' | 'non-veg',
    tags: '',
    imageUrl: '',
    ingredients: '',
    isAvailable: true
  });
  const toast = useToast();

  useEffect(() => { loadPizzas(); }, []);

  const loadPizzas = async () => {
    const res = await pizzaApi.adminGetAll();
    setPizzas(res.data.pizzas);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(i => i),
        price: Number(formData.price)
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
    } catch (err) {
      toast('Something went wrong');
    }
  };

  const handleToggle = async (id: string) => {
    await pizzaApi.adminToggleAvailability(id);
    loadPizzas();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this pizza?')) {
      await pizzaApi.adminDelete(id);
      toast('Pizza deleted successfully');
      loadPizzas();
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: 'veg',
      tags: '',
      imageUrl: '',
      ingredients: '',
      isAvailable: true
    });
    setShowModal('create');
  };

  const openEditModal = (pizza: Pizza) => {
    setSelectedPizza(pizza);
    setFormData({
      name: pizza.name,
      description: pizza.description,
      price: pizza.price,
      category: pizza.category,
      tags: pizza.tags.join(', '),
      imageUrl: pizza.imageUrl,
      ingredients: pizza.ingredients.join(', '),
      isAvailable: pizza.isAvailable
    });
    setShowModal('edit');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-forno-text-primary">Pizza Management</h2>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 accent-gradient text-white rounded-button hover:brightness-110 transition-all">
          <Plus size={16} />
          Add Pizza
        </button>
      </div>

      {/* Pizza Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {pizzas.map((pizza, i) => (
          <motion.div key={pizza._id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            className={`glass-card p-6 relative ${!pizza.isAvailable ? 'opacity-60' : ''}`}>

            <div className="flex items-center justify-between mb-4">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                pizza.category === 'veg' ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
              }`}>{pizza.category}</span>
              <div className="flex gap-2">
                {pizza.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-forno-bg-tertiary rounded text-[10px] text-forno-text-muted">{tag}</span>
                ))}
              </div>
            </div>

            <div className="relative mb-4 rounded-lg overflow-hidden">
              <img src={pizza.imageUrl || 'https://placehold.co/400x300/1E1A15/FF6B35?text=No+Image'} alt={pizza.name} className="w-full h-40 object-cover" />
              {!pizza.isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-semibold flex items-center gap-1">
                    <EyeOff size={14} />
                    Hidden
                  </span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-forno-text-primary mb-1">{pizza.name}</h4>
              <p className="text-sm text-forno-text-secondary line-clamp-2">{pizza.description}</p>
              <p className="text-lg font-mono font-semibold mt-2" style={{ color: '#FF6B35' }}>₹{pizza.price}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleToggle(pizza._id)} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all">
                {pizza.isAvailable ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => openEditModal(pizza)} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-forno-text-primary hover:border-[#FF6B35]/30 transition-all">
                <Edit size={14} />
              </button>
              <button onClick={() => handleDelete(pizza._id)} className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-red-500 hover:border-red-500/30 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card-elevated p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-forno-text-primary mb-4">
                {showModal === 'create' ? 'Add New Pizza' : 'Edit Pizza'}
              </h3>
              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50 min-h-[100px]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Price</label>
                    <input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))}
                      className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-forno-text-muted mb-1">Category</label>
                    <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value as 'veg' | 'non-veg' }))}
                      className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50">
                      <option value="veg">Veg</option>
                      <option value="non-veg">Non-Veg</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Tags (comma separated)</label>
                  <input type="text" value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="bestseller, spicy"
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Ingredients (comma separated)</label>
                  <input type="text" value={formData.ingredients} onChange={e => setFormData(p => ({ ...p, ingredients: e.target.value }))} placeholder="Mozzarella, Pepperoni, Tomato Sauce"
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Image URL</label>
                  <input type="text" value={formData.imageUrl} onChange={e => setFormData(p => ({ ...p, imageUrl: e.target.value }))}
                    className="w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData(p => ({ ...p, isAvailable: e.target.checked }))} id="available" />
                  <label htmlFor="available" className="text-sm text-forno-text-secondary">Available</label>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(null)} className="flex-1 py-2.5 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary transition-all">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 py-2.5 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
