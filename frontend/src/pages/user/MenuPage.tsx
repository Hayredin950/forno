import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Plus, Minus, Flame } from 'lucide-react';
import { pizzaApi, cartApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import type { Pizza } from '@/types';

const banners = [
  { title: 'New: Truffle Collection', desc: 'Experience luxury. Try our new truffle-infused pizzas.', cta: 'Explore', link: '/dashboard', img: import.meta.env.BASE_URL + 'images/pizza-truffle.jpg' },
  { title: 'Build Your Own', desc: '25+ ingredients. One perfect pizza. Start building today.', cta: 'Start Building', link: '/dashboard/builder', img: import.meta.env.BASE_URL + 'images/pizza-margherita.jpg' },
  { title: 'Free Delivery', desc: 'On orders above ₹500. Limited time offer.', cta: 'Order Now', link: '/dashboard', img: import.meta.env.BASE_URL + 'images/pizza-pepperoni.jpg' },
];

const filters = ['All', 'Veg', 'Non-Veg', 'Spicy', 'Bestseller'];

export default function MenuPage() {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [bannerIdx, setBannerIdx] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [previewPizza, setPreviewPizza] = useState<Pizza | null>(null);
  const [previewQuantity, setPreviewQuantity] = useState(1);
  const [previewAdding, setPreviewAdding] = useState(false);
  const toast = useToast();

  useEffect(() => { loadPizzas(); }, [activeFilter]);
  useEffect(() => {
    const interval = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPizzas = async () => {
    const params: any = {};
    if (activeFilter === 'Veg') params.category = 'veg';
    if (activeFilter === 'Non-Veg') params.category = 'non-veg';
    if (activeFilter === 'Spicy') params.tag = 'spicy';
    if (activeFilter === 'Bestseller') params.tag = 'bestseller';
    const res = await pizzaApi.getAll(params);
    if (res.success && res.data) {
      setPizzas(res.data.pizzas);
    }
  };

  const addToCart = async (pizza: Pizza) => {
    setAddingId(pizza._id);
    await cartApi.addItem({
      id: `pizza_${pizza._id}`,
      type: 'pizza',
      name: pizza.name,
      pizzaId: pizza._id,
      imageUrl: pizza.imageUrl,
      quantity: 1,
      unitPrice: pizza.price,
      totalPrice: pizza.price,
    });
    toast(`${pizza.name} added to cart!`);
    setTimeout(() => setAddingId(null), 1500);
  };

  const openPreview = (pizza: Pizza) => {
    setPreviewPizza(pizza);
    setPreviewQuantity(1);
  };

  const closePreview = () => {
    setPreviewPizza(null);
    setPreviewQuantity(1);
  };

  const addToCartFromPreview = async () => {
    if (!previewPizza) return;
    setPreviewAdding(true);
    await cartApi.addItem({
      id: `pizza_${previewPizza._id}`,
      type: 'pizza',
      name: previewPizza.name,
      pizzaId: previewPizza._id,
      imageUrl: previewPizza.imageUrl,
      quantity: previewQuantity,
      unitPrice: previewPizza.price,
      totalPrice: previewPizza.price * previewQuantity,
    });
    toast(`${previewQuantity}x ${previewPizza.name} added to cart!`);
    setPreviewAdding(false);
    closePreview();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
      {/* Banner Carousel */}
      <div className="relative h-48 lg:h-56 rounded-xl overflow-hidden mb-10">
        {banners.map((b, i) => (
          <motion.div key={i} initial={false} animate={{ x: `${(i - bannerIdx) * 100}%` }} transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img src={b.img} alt={b.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D0B0A]/80 via-[#0D0B0A]/60 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-6 lg:p-8">
              <h3 className="text-xl lg:text-2xl font-semibold text-forno-text-primary mb-2">{b.title}</h3>
              <p className="text-sm text-forno-text-secondary mb-4 max-w-md">{b.desc}</p>
              <Link to={b.link} className="inline-flex px-6 py-3 text-sm font-semibold accent-gradient text-white rounded-button hover:brightness-110 transition-all shadow-glow-amber w-fit">
                {b.cta}
              </Link>
            </div>
          </motion.div>
        ))}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <div key={i} className="h-[3px] w-8 rounded-full overflow-hidden bg-white/15">
              {i === bannerIdx && <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 5, ease: 'linear' }} className="h-full accent-gradient" />}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-5 py-2.5 rounded-pill text-sm font-semibold whitespace-nowrap transition-all ${
              activeFilter === f ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30' : 'bg-forno-bg-tertiary text-forno-text-secondary border border-forno-border hover:text-forno-text-primary hover:border-[#FF6B35]/20'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Pizza Grid - Premium Style like Landing Page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pizzas.map((pizza, i) => (
          <motion.div
            key={pizza._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="glass-card overflow-hidden group cursor-pointer hover:border-[#FF6B35]/20 transition-all duration-300"
            style={{ perspective: '1000px' }}
            onClick={() => openPreview(pizza)}
          >
            <div className="overflow-hidden aspect-[4/3]">
              <img
                src={pizza.imageUrl}
                alt={pizza.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {pizza.category === 'veg' && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-green-500/20 text-green-500 text-xs font-semibold uppercase rounded-full border border-green-500/30">
                  Veg
                </span>
              )}
              {pizza.category === 'non-veg' && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-red-500/20 text-red-500 text-xs font-semibold uppercase rounded-full border border-red-500/30">
                  Non-Veg
                </span>
              )}
              {pizza.tags.includes('bestseller') && (
                <span className="absolute top-4 right-4 px-3 py-1.5 bg-[#FF6B35]/20 text-[#FF6B35] text-xs font-semibold uppercase rounded-full border border-[#FF6B35]/30">
                  Bestseller
                </span>
              )}
              {pizza.tags.includes('spicy') && !pizza.tags.includes('bestseller') && (
                <span className="absolute top-4 right-4 px-3 py-1.5 bg-red-500/20 text-red-500 text-xs font-semibold uppercase rounded-full border border-red-500/30">
                  Spicy
                </span>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-forno-text-primary mb-1">{pizza.name}</h3>
              <p className="text-sm text-forno-text-secondary mb-4 line-clamp-2">{pizza.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono font-semibold" style={{ color: '#FF6B35' }}>₹{pizza.price}</span>
                <button onClick={(e) => { e.stopPropagation(); addToCart(pizza); }}
                  className={`px-4 py-2 text-sm font-medium rounded-button transition-all ${
                    addingId === pizza._id ? 'bg-forno-status-success text-white' : 'accent-gradient text-white hover:brightness-110'
                  }`}
                >
                  {addingId === pizza._id ? 'Added ✓' : 'Add'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pizza Detail Preview Modal */}
      <AnimatePresence>
        {previewPizza && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closePreview}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card-elevated max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <button
                  onClick={closePreview}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-forno-bg-tertiary border border-forno-border flex items-center justify-center text-forno-text-primary hover:border-[#FF6B35]/50 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img src={previewPizza.imageUrl} alt={previewPizza.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      {previewPizza.category === 'veg' && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-500 text-xs font-semibold uppercase rounded-full border border-green-500/30">Veg</span>
                      )}
                      {previewPizza.category === 'non-veg' && (
                        <span className="px-3 py-1 bg-red-500/20 text-red-500 text-xs font-semibold uppercase rounded-full border border-red-500/30">Non-Veg</span>
                      )}
                      {previewPizza.tags.includes('bestseller') && (
                        <span className="px-3 py-1 bg-[#FF6B35]/20 text-[#FF6B35] text-xs font-semibold uppercase rounded-full border border-[#FF6B35]/30">Bestseller</span>
                      )}
                      {previewPizza.tags.includes('spicy') && (
                        <span className="px-3 py-1 bg-red-500/20 text-red-500 text-xs font-semibold uppercase rounded-full border border-red-500/30">Spicy</span>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-6 flex flex-col">
                    <h2 className="text-2xl lg:text-3xl font-semibold text-forno-text-primary mb-3">{previewPizza.name}</h2>
                    <p className="text-forno-text-secondary mb-6">{previewPizza.description}</p>

                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-3xl font-mono font-semibold" style={{ color: '#FF6B35' }}>₹{previewPizza.price}</span>
                      <span className="text-forno-text-muted">per pizza</span>
                    </div>

                    <div className="glass-card p-5 mb-6">
                      <h3 className="font-semibold text-forno-text-primary mb-3">Ingredients</h3>
                      <div className="flex flex-wrap gap-2">
                        {previewPizza.ingredients.map((ing, i) => (
                          <span key={i} className="px-3 py-1.5 bg-forno-bg-tertiary border border-forno-border rounded-full text-sm text-forno-text-secondary">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="glass-card p-5 mb-8">
                      <h3 className="font-semibold text-forno-text-primary mb-3">Quantity</h3>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setPreviewQuantity(Math.max(1, previewQuantity - 1))}
                          className="w-10 h-10 rounded-lg bg-forno-bg-tertiary border border-forno-border flex items-center justify-center text-forno-text-primary hover:border-[#FF6B35]/50 transition-colors"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="text-2xl font-mono font-semibold text-forno-text-primary w-12 text-center">{previewQuantity}</span>
                        <button
                          onClick={() => setPreviewQuantity(previewQuantity + 1)}
                          className="w-10 h-10 rounded-lg bg-forno-bg-tertiary border border-forno-border flex items-center justify-center text-forno-text-primary hover:border-[#FF6B35]/50 transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-forno-text-muted">Total</p>
                          <p className="text-2xl font-mono font-semibold" style={{ color: '#FF6B35' }}>₹{(previewPizza.price * previewQuantity).toFixed(2)}</p>
                        </div>
                      </div>
                      <button
                        onClick={addToCartFromPreview}
                        disabled={previewAdding}
                        className="w-full py-4 accent-gradient rounded-button text-white font-semibold text-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow-amber"
                      >
                        {previewAdding ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Flame size={20} />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
