import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    setPizzas(res.data.pizzas);
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

  return (
    <div>
      {/* Banner Carousel */}
      <div className="relative h-48 lg:h-56 rounded-xl overflow-hidden mb-8">
        {banners.map((b, i) => (
          <motion.div key={i} initial={false} animate={{ x: `${(i - bannerIdx) * 100}%` }} transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0">
            <img src={b.img} alt={b.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-forno-bg-primary/80 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-8">
              <h3 className="text-xl lg:text-2xl font-semibold text-forno-text-primary mb-2">{b.title}</h3>
              <p className="text-sm text-forno-text-secondary mb-4 max-w-xs">{b.desc}</p>
              <Link to={b.link} className="inline-flex px-4 py-2 accent-gradient rounded-button text-white text-sm font-medium w-fit hover:brightness-110 transition-all">{b.cta}</Link>
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
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === f ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30' : 'bg-forno-bg-tertiary text-forno-text-secondary border border-forno-border hover:text-forno-text-primary'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Pizza Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pizzas.map((pizza, i) => (
          <motion.div key={pizza._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card overflow-hidden group cursor-pointer hover:border-[#FF6B35]/20 transition-all duration-300">
            <Link to={`/dashboard/pizza/${pizza._id}`} className="block">
              <div className="relative aspect-square overflow-hidden">
                <img src={pizza.imageUrl} alt={pizza.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {pizza.category === 'veg' && <span className="absolute top-3 left-3 px-2 py-0.5 bg-forno-status-success/20 text-forno-status-success text-[11px] font-semibold rounded-full">Veg</span>}
                {pizza.category === 'non-veg' && <span className="absolute top-3 left-3 px-2 py-0.5 bg-forno-accent-red/20 text-forno-accent-red text-[11px] font-semibold rounded-full">Non-Veg</span>}
                {pizza.tags.includes('bestseller') && <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#FF6B35]/20 text-[#FF6B35] text-[11px] font-semibold rounded-full">Bestseller</span>}
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-forno-text-primary mb-1">{pizza.name}</h4>
                <p className="text-xs text-forno-text-secondary mb-3 line-clamp-2">{pizza.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-semibold text-forno-text-primary">₹{pizza.price}</span>
                  <button onClick={(e) => { e.preventDefault(); addToCart(pizza); }}
                    className={`px-4 py-2 text-sm font-medium rounded-button transition-all ${
                      addingId === pizza._id ? 'bg-forno-status-success text-white' : 'accent-gradient text-white hover:brightness-110'
                    }`}>
                    {addingId === pizza._id ? 'Added ✓' : 'Add'}
                  </button>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
