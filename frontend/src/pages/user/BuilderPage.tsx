import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight, Shuffle, ShoppingCart, Search, Info } from 'lucide-react';
import { inventoryApi, cartApi, siteConfigApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import PizzaPreview from '@/components/shared/PizzaPreview';
import { ingredientImage } from '@/lib/pizzaLayers';
import type { InventoryItem } from '@/types';

const STEPS = [
  { key: 'base', label: 'Base', instruction: 'Choose one base for your pizza' },
  { key: 'sauce', label: 'Sauce', instruction: 'Pick your favorite sauce' },
  { key: 'cheese', label: 'Cheese', instruction: 'Select your cheese' },
  { key: 'veggies', label: 'Veggies', instruction: 'Add toppings (multiple allowed)' },
];

export default function BuilderPage() {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<{ base: InventoryItem | null; sauce: InventoryItem | null; cheese: InventoryItem | null; veggies: InventoryItem[] }>({ base: null, sauce: null, cheese: null, veggies: [] });
  const [direction, setDirection] = useState(1);
  const [loadingError, setLoadingError] = useState(false);
  const [ingSearch, setIngSearch] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  // Custom-pizza base price is admin-controllable; default ₹200 until loaded.
  const [customBasePrice, setCustomBasePrice] = useState(200);
  useEffect(() => {
    siteConfigApi.get().then((res) => {
      if (res.success) setCustomBasePrice(res.data.pricing.customBasePrice);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadInventory(); }, []);

  // A search from a previous step shouldn't silently empty the next one.
  useEffect(() => { setIngSearch(''); }, [step]);

  const loadInventory = async () => {
    try {
      const res = await inventoryApi.getAllForBuilder();
      setItems(res.data.items);
      setLoadingError(false);
    } catch {
      setLoadingError(true);
    }
  };

  const currentItems = useMemo(() => {
    const q = ingSearch.trim().toLowerCase();
    return items.filter(i => i.category === STEPS[step].key && (!q || i.name.toLowerCase().includes(q)));
  }, [items, step, ingSearch]);

  const currentKey = STEPS[step].key as keyof typeof selected;
  const isMulti = currentKey === 'veggies';

  const isSelected = (item: InventoryItem) => {
    if (isMulti) return selected.veggies.some(v => v._id === item._id);
    return (selected as any)[currentKey]?._id === item._id;
  };

  const toggleSelect = (item: InventoryItem) => {
    if (isMulti) {
      setSelected(prev => ({
        ...prev,
        veggies: prev.veggies.some(v => v._id === item._id)
          ? prev.veggies.filter(v => v._id !== item._id)
          : [...prev.veggies, item]
      }));
    } else {
      setSelected(prev => ({ ...prev, [currentKey]: (prev as any)[currentKey]?._id === item._id ? null : item }));
    }
  };

  const totalPrice = useMemo(() => {
    let total = 0;
    if (selected.base) total += selected.base.unitPrice;
    if (selected.sauce) total += selected.sauce.unitPrice;
    if (selected.cheese) total += selected.cheese.unitPrice;
    selected.veggies.forEach(v => total += v.unitPrice);
    return total;
  }, [selected]);

  const canProceed = isMulti ? true : !!(selected as any)[currentKey];

  const surpriseMe = () => {
    const catItems = items.filter(i => i.category === STEPS[step].key);
    if (catItems.length === 0) return;
    if (isMulti) {
      const count = Math.floor(Math.random() * 3) + 2;
      const shuffled = [...catItems].sort(() => Math.random() - 0.5);
      setSelected(prev => ({ ...prev, veggies: shuffled.slice(0, count) }));
    } else {
      const random = catItems[Math.floor(Math.random() * catItems.length)];
      setSelected(prev => ({ ...prev, [currentKey]: random }));
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) { setDirection(1); setStep(s => s + 1); }
    else handleAddToCart();
  };

  const handleBack = () => {
    if (step > 0) { setDirection(-1); setStep(s => s - 1); }
  };

  const handleAddToCart = async () => {
    if (!selected.base || !selected.sauce || !selected.cheese) return;
    const name = `Custom ${selected.base.name}`;
    // Deterministic id from the ingredient choices so identical builds merge
    // into one cart line instead of creating duplicates on every add.
    const veggieIds = selected.veggies.map(v => v._id).sort();
    const id = `custom_${selected.base._id}_${selected.sauce._id}_${selected.cheese._id}_${veggieIds.join('_')}`;
    await cartApi.addItem({
      id,
      type: 'custom',
      name,
      base: selected.base.name,
      baseId: selected.base._id,
      sauce: selected.sauce.name,
      sauceId: selected.sauce._id,
      cheese: selected.cheese.name,
      cheeseId: selected.cheese._id,
      veggies: selected.veggies.map(v => v.name),
      veggieIds,
      quantity: 1,
      unitPrice: totalPrice + customBasePrice,
      totalPrice: totalPrice + customBasePrice,
    });
    toast('Custom pizza added to cart!');
    navigate('/dashboard/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
      {/* Step Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i < step ? 'bg-forno-status-success text-white' :
                    i === step ? 'text-white' : 'border-2 border-forno-text-muted text-forno-text-muted'
                  }`}
                  style={i === step ? { background: 'linear-gradient(135deg, #FF6B35, #F7931E)' } : {}}
                  animate={i === step ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  {i < step ? <Check size={18} /> : i + 1}
                </motion.div>
                <span className={`text-xs mt-2 font-medium ${i === step ? 'text-forno-text-primary' : 'text-forno-text-muted'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-forno-bg-tertiary relative">
                  <motion.div initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.4 }} className="absolute inset-y-0 left-0"
                    style={{ background: i < step ? 'linear-gradient(90deg, #FF6B35, #F7931E)' : undefined }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Ingredient Selection */}
        <div className="flex-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step} custom={direction} initial={{ x: direction * 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: direction * -50, opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-forno-text-primary">{STEPS[step].label}</h3>
                  <p className="text-sm text-forno-text-secondary">{STEPS[step].instruction}</p>
                </div>
                <button onClick={surpriseMe} className="flex items-center gap-2 px-3 py-2 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:border-[#FF6B35]/30 hover:text-forno-text-primary transition-all">
                  <Shuffle size={14} /> Surprise Me
                </button>
              </div>

              {/* Filter the current step's ingredients */}
              <div className="relative mb-5">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forno-text-muted" />
                <input type="text" value={ingSearch} onChange={e => setIngSearch(e.target.value)}
                  placeholder={`Search ${STEPS[step].label.toLowerCase()}...`}
                  className="pl-9 pr-8 py-2 w-full bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50" />
                {ingSearch && <button onClick={() => setIngSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-forno-text-muted hover:text-forno-text-primary">×</button>}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                {loadingError && (
                  <div className="col-span-full text-center py-10">
                    <p className="text-forno-text-muted mb-3">Couldn't load ingredients. Check your connection.</p>
                    <button onClick={loadInventory} className="px-4 py-2 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all">Retry</button>
                  </div>
                )}
                {!loadingError && currentItems.length === 0 && (
                  <div className="col-span-full text-center py-10 text-forno-text-muted">
                    {ingSearch.trim() ? `No ${STEPS[step].label.toLowerCase()} match "${ingSearch.trim()}".` : 'No ingredients available in this category yet.'}
                  </div>
                )}
                {currentItems.map(item => {
                  const imageUrl = ingredientImage(item.name);
                  return (
                    <motion.button key={item._id}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => toggleSelect(item)}
                      className={`relative glass-card p-4 text-center transition-all ${
                        isSelected(item) ? 'border-[#FF6B35] shadow-glow-amber' : 'border-forno-border hover:border-[#FF6B35]/30'
                      }`}>
                      <div className={`w-16 h-16 mx-auto rounded-full overflow-hidden mb-3 bg-forno-bg-tertiary ${isSelected(item) ? 'ring-2 ring-[#FF6B35]' : ''}`}>
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.name} loading="lazy" draggable={false}
                            className="w-full h-full object-cover" style={{ background: '#1a1513' }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg text-forno-text-muted">
                            {item.name[0]}
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-forno-text-primary mb-1">{item.name}</p>
                      {item.unitPrice > 0 && <p className="text-xs text-forno-text-muted">+₹{item.unitPrice}</p>}
                      {isSelected(item) && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-5 h-5 accent-gradient rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button onClick={handleBack} disabled={step === 0} className="flex items-center gap-2 px-4 py-2 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleNext} disabled={!canProceed} className="flex items-center gap-2 px-6 py-2 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {step === STEPS.length - 1 ? <>Add to Cart <ShoppingCart size={16} /></> : <>Next <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:w-80">
          <div className="lg:sticky lg:top-8">
            <div className="glass-card p-6">
              <h4 className="text-sm font-semibold text-forno-text-primary mb-4 uppercase tracking-wider">Your Pizza</h4>

              {/* Real-image Pizza Preview — stacks the user's chosen base/sauce/cheese/veggies */}
              <motion.div
                key={`${selected.base?._id}-${selected.sauce?._id}-${selected.cheese?._id}-${selected.veggies.map(v => v._id).join('-')}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="mx-auto mb-6"
              >
                <PizzaPreview
                  base={selected.base}
                  sauce={selected.sauce}
                  cheese={selected.cheese}
                  veggies={selected.veggies}
                  size={192}
                  className="mx-auto"
                />
              </motion.div>

              {/* Selected Items List */}
              <div className="space-y-2 mb-4">
                {selected.base && <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">{selected.base.name}</span><span className="font-mono text-forno-text-primary">{selected.base.unitPrice > 0 ? `+₹${selected.base.unitPrice}` : 'Included'}</span></div>}
                {selected.sauce && <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">{selected.sauce.name}</span><span className="font-mono text-forno-text-primary">{selected.sauce.unitPrice > 0 ? `+₹${selected.sauce.unitPrice}` : 'Included'}</span></div>}
                {selected.cheese && <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">{selected.cheese.name}</span><span className="font-mono text-forno-text-primary">{selected.cheese.unitPrice > 0 ? `+₹${selected.cheese.unitPrice}` : 'Included'}</span></div>}
                {selected.veggies.map(v => (
                  <div key={v._id} className="flex justify-between text-sm"><span className="text-forno-text-secondary">{v.name}</span><span className="font-mono text-forno-text-primary">+₹{v.unitPrice}</span></div>
                ))}
              </div>
              <div className="border-t border-forno-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-forno-text-secondary">Subtotal</span>
                  <motion.span key={totalPrice} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="text-xl font-mono font-semibold text-forno-text-primary">
                    ₹{totalPrice + customBasePrice}
                  </motion.span>
                </div>
                {/* Base-price explainer: what the admin-controlled base covers */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <p className="text-xs text-forno-text-muted">Base price ₹{customBasePrice} + ingredients</p>
                  <span className="relative group inline-flex">
                    <Info size={13} className="text-forno-text-muted cursor-help hover:text-[#FF6B35] transition-colors" />
                    <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 p-3 rounded-lg bg-forno-bg-secondary border border-forno-border text-[11px] leading-relaxed text-forno-text-secondary opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
                      The base price covers the hand-tossed dough, sauce, cheese and baking. Every extra ingredient is priced individually on top of it.
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
