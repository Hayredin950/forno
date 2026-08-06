import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight, Shuffle, ShoppingCart } from 'lucide-react';
import { inventoryApi, cartApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';
import type { InventoryItem } from '@/types';

const STEPS = [
  { key: 'base', label: 'Base', instruction: 'Choose one base for your pizza' },
  { key: 'sauce', label: 'Sauce', instruction: 'Pick your favorite sauce' },
  { key: 'cheese', label: 'Cheese', instruction: 'Select your cheese' },
  { key: 'vegetable', label: 'Veggies', instruction: 'Add toppings (multiple allowed)' },
];

export default function BuilderPage() {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<{ base: InventoryItem | null; sauce: InventoryItem | null; cheese: InventoryItem | null; vegetable: InventoryItem[] }>({ base: null, sauce: null, cheese: null, vegetable: [] });
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    const res = await inventoryApi.getAllForBuilder();
    setItems(res.data.items);
  };

  const currentItems = useMemo(() => {
    return items.filter(i => i.category === STEPS[step].key);
  }, [items, step]);

  const currentKey = STEPS[step].key as keyof typeof selected;
  const isMulti = currentKey === 'vegetable';

  const isSelected = (item: InventoryItem) => {
    if (isMulti) return selected.vegetable.some(v => v._id === item._id);
    return (selected as any)[currentKey]?._id === item._id;
  };

  const toggleSelect = (item: InventoryItem) => {
    if (isMulti) {
      setSelected(prev => ({
        ...prev,
        vegetable: prev.vegetable.some(v => v._id === item._id)
          ? prev.vegetable.filter(v => v._id !== item._id)
          : [...prev.vegetable, item]
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
    selected.vegetable.forEach(v => total += v.unitPrice);
    return total;
  }, [selected]);

  const canProceed = isMulti ? true : !!(selected as any)[currentKey];

  const surpriseMe = () => {
    const catItems = items.filter(i => i.category === STEPS[step].key);
    if (catItems.length === 0) return;
    if (isMulti) {
      const count = Math.floor(Math.random() * 3) + 2;
      const shuffled = [...catItems].sort(() => Math.random() - 0.5);
      setSelected(prev => ({ ...prev, vegetable: shuffled.slice(0, count) }));
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
    await cartApi.addItem({
      id: `custom_${Date.now()}`,
      type: 'custom',
      name,
      base: selected.base.name,
      baseId: selected.base._id,
      sauce: selected.sauce.name,
      sauceId: selected.sauce._id,
      cheese: selected.cheese.name,
      cheeseId: selected.cheese._id,
      veggies: selected.vegetable.map(v => v.name),
      veggieIds: selected.vegetable.map(v => v._id),
      quantity: 1,
      unitPrice: totalPrice + 200,
      totalPrice: totalPrice + 200,
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-forno-text-primary">{STEPS[step].label}</h3>
                  <p className="text-sm text-forno-text-secondary">{STEPS[step].instruction}</p>
                </div>
                <button onClick={surpriseMe} className="flex items-center gap-2 px-3 py-2 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:border-[#FF6B35]/30 hover:text-forno-text-primary transition-all">
                  <Shuffle size={14} /> Surprise Me
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                {currentItems.map(item => (
                  <motion.button key={item._id}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => toggleSelect(item)}
                    className={`glass-card p-4 text-center transition-all ${
                      isSelected(item) ? 'border-[#FF6B35] shadow-glow-amber' : 'border-forno-border hover:border-[#FF6B35]/30'
                    }`}>
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 text-lg ${
                      isSelected(item) ? 'accent-gradient text-white' : 'bg-forno-bg-tertiary text-forno-text-muted'
                    }`}>
                      {item.name[0]}
                    </div>
                    <p className="text-sm font-medium text-forno-text-primary mb-1">{item.name}</p>
                    {item.unitPrice > 0 && <p className="text-xs text-forno-text-muted">+₹{item.unitPrice}</p>}
                    {isSelected(item) && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-5 h-5 accent-gradient rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
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

              {/* Visual Pizza Preview */}
              <div className="relative w-48 h-48 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-forno-bg-tertiary border-2 border-forno-border" />
                {/* Base */}
                <AnimatePresence>
                  {selected.base && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }} className="absolute inset-2 rounded-full bg-[#D4A76A] border border-[#C49A5E]" />
                  )}
                </AnimatePresence>
                {/* Sauce */}
                <AnimatePresence>
                  {selected.sauce && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }} className="absolute inset-4 rounded-full border border-dashed"
                      style={{ background: selected.sauce.name.includes('BBQ') ? '#5C3317' : selected.sauce.name.includes('Pesto') ? '#4A7C3F' : selected.sauce.name.includes('Garlic') ? '#F5F5DC' : selected.sauce.name.includes('Spicy') ? '#C1440E' : '#C53030' }} />
                  )}
                </AnimatePresence>
                {/* Cheese */}
                <AnimatePresence>
                  {selected.cheese && (
                    <motion.div initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 0.8, filter: 'blur(0px)' }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }} className="absolute inset-6 rounded-full bg-[#FFF8E7]" />
                  )}
                </AnimatePresence>
                {/* Veggies */}
                <AnimatePresence>
                  {selected.vegetable.map((v, i) => (
                    <motion.div key={v._id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12, delay: i * 0.05 }}
                      className="absolute w-4 h-4 rounded-full"
                      style={{
                        background: v.name.includes('Pepper') ? '#7CB342' : v.name.includes('Mushroom') ? '#8D6E63' : v.name.includes('Onion') ? '#9C27B0' : v.name.includes('Olive') ? '#212121' : v.name.includes('Tomato') ? '#E53935' : v.name.includes('Jalap') ? '#FF6B35' : v.name.includes('Spinach') ? '#4CAF50' : '#FFEB3B',
                        top: `${25 + (i * 37) % 55}%`,
                        left: `${20 + (i * 53) % 60}%`,
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Selected Items List */}
              <div className="space-y-2 mb-4">
                {selected.base && <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">{selected.base.name}</span><span className="font-mono text-forno-text-primary">{selected.base.unitPrice > 0 ? `+₹${selected.base.unitPrice}` : 'Included'}</span></div>}
                {selected.sauce && <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">{selected.sauce.name}</span><span className="font-mono text-forno-text-primary">{selected.sauce.unitPrice > 0 ? `+₹${selected.sauce.unitPrice}` : 'Included'}</span></div>}
                {selected.cheese && <div className="flex justify-between text-sm"><span className="text-forno-text-secondary">{selected.cheese.name}</span><span className="font-mono text-forno-text-primary">{selected.cheese.unitPrice > 0 ? `+₹${selected.cheese.unitPrice}` : 'Included'}</span></div>}
                {selected.vegetable.map(v => (
                  <div key={v._id} className="flex justify-between text-sm"><span className="text-forno-text-secondary">{v.name}</span><span className="font-mono text-forno-text-primary">+₹{v.unitPrice}</span></div>
                ))}
              </div>
              <div className="border-t border-forno-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-forno-text-secondary">Subtotal</span>
                  <motion.span key={totalPrice} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="text-xl font-mono font-semibold text-forno-text-primary">
                    ₹{totalPrice + 200}
                  </motion.span>
                </div>
                <p className="text-xs text-forno-text-muted mt-1">Base price ₹200 + ingredients</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
