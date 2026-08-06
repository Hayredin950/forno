import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Flame } from 'lucide-react';
import { pizzaApi, cartApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import type { Pizza } from '@/types';

export default function PizzaDetailPage() {
  const { pizzaId } = useParams<{ pizzaId: string }>();
  const [pizza, setPizza] = useState<Pizza | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (pizzaId) loadPizza(pizzaId);
  }, [pizzaId]);

  const loadPizza = async (id: string) => {
    try {
      const res = await pizzaApi.getById(id);
      if (res.success) setPizza(res.data.pizza);
    } catch {
      toast('Failed to load pizza details', 'error');
      navigate('/dashboard');
    }
  };

  const addToCart = async () => {
    if (!pizza) return;
    setAdding(true);
    await cartApi.addItem({
      id: `pizza_${pizza._id}`,
      type: 'pizza',
      name: pizza.name,
      pizzaId: pizza._id,
      imageUrl: pizza.imageUrl,
      quantity: quantity,
      unitPrice: pizza.price,
      totalPrice: pizza.price * quantity,
    });
    toast(`${quantity}x ${pizza.name} added to cart!`);
    setAdding(false);
  };

  if (!pizza) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-forno-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-forno-text-secondary hover:text-forno-text-primary mb-6 transition-colors">
        <ArrowLeft size={20} />
        Back to Menu
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card-elevated overflow-hidden">
          <div className="aspect-square">
            <img src={pizza.imageUrl} alt={pizza.name} className="w-full h-full object-cover" />
          </div>
          <div className="p-4 flex gap-2">
            {pizza.category === 'veg' && <span className="px-3 py-1 bg-forno-status-success/20 text-forno-status-success text-xs font-semibold rounded-full">Veg</span>}
            {pizza.category === 'non-veg' && <span className="px-3 py-1 bg-forno-accent-red/20 text-forno-accent-red text-xs font-semibold rounded-full">Non-Veg</span>}
            {pizza.tags.includes('bestseller') && <span className="px-3 py-1 bg-[#FF6B35]/20 text-[#FF6B35] text-xs font-semibold rounded-full">Bestseller</span>}
            {pizza.tags.includes('spicy') && <span className="px-3 py-1 bg-forno-accent-red/20 text-forno-accent-red text-xs font-semibold rounded-full">Spicy</span>}
          </div>
        </motion.div>

        {/* Details */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold text-forno-text-primary mb-3">{pizza.name}</h1>
            <p className="text-lg text-forno-text-secondary">{pizza.description}</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-3xl font-mono font-semibold text-[#FF6B35]">₹{pizza.price}</span>
            <span className="text-forno-text-muted">per pizza</span>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-forno-text-primary mb-3">Ingredients</h3>
            <div className="flex flex-wrap gap-2">
              {pizza.ingredients.map((ing, i) => (
                <span key={i} className="px-3 py-1 bg-forno-bg-tertiary border border-forno-border rounded-full text-sm text-forno-text-secondary">
                  {ing}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-forno-text-primary mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg bg-forno-bg-tertiary border border-forno-border flex items-center justify-center text-forno-text-primary hover:border-[#FF6B35]/50 transition-colors"
              >
                <Minus size={18} />
              </button>
              <span className="text-2xl font-mono font-semibold text-forno-text-primary w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg bg-forno-bg-tertiary border border-forno-border flex items-center justify-center text-forno-text-primary hover:border-[#FF6B35]/50 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm text-forno-text-muted">Total</p>
              <p className="text-2xl font-mono font-semibold text-[#FF6B35]">₹{(pizza.price * quantity).toFixed(2)}</p>
            </div>
            <button
              onClick={addToCart}
              disabled={adding}
              className="px-8 py-4 accent-gradient rounded-button text-white font-semibold text-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {adding ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Flame size={20} />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}