import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ChevronDown, Pointer, Layers, Flame, Bike } from 'lucide-react';
import { pizzaApi } from '@/services/api';
import type { Pizza } from '@/types';

function CountUp({ target, suffix = '', duration = 1500 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const steps = [
  { icon: Pointer, num: '01', title: 'Choose', desc: 'Browse our menu or start from scratch with the builder.' },
  { icon: Layers, num: '02', title: 'Build', desc: 'Pick your base, sauce, cheese, and toppings. Watch it come alive.' },
  { icon: Flame, num: '03', title: 'Bake', desc: 'We fire your creation in our wood-fired oven at 450°C.' },
  { icon: Bike, num: '04', title: 'Deliver', desc: 'Track your order in real time as it speeds to your door.' },
];

const stats = [
  { value: 50000, suffix: '+', label: 'Pizzas Baked' },
  { value: 4.9, suffix: '', label: 'Star Rating', isDecimal: true },
  { value: 15, suffix: '', label: 'Minutes Avg. Delivery' },
  { value: 25, suffix: '+', label: 'Ingredient Choices' },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollIndicatorVisible, setScrollIndicatorVisible] = useState(true);
  const [featuredPizzas, setFeaturedPizzas] = useState<Pizza[]>([]);

  // Featured pizzas come from the database (most-ordered, available only) —
  // never hardcoded, so menu changes show up here automatically.
  useEffect(() => {
    pizzaApi.getAll({ sort: 'popular' }).then((res) => {
      if (res.success) setFeaturedPizzas(res.data.pizzas.slice(0, 6));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollIndicatorVisible(window.scrollY < 100);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-forno-bg-primary">
      {/* Hero Section */}
      <section ref={heroRef} className="relative h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
          <motion.img
            src={import.meta.env.BASE_URL + 'images/hero-oven.jpg'}
            alt="Wood-fired oven"
            className="w-full h-full object-cover"
            animate={{ scale: [1, 1.08] }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0B0A]/30 via-[#0D0B0A]/60 to-[#0D0B0A]" />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6 pt-20">
          <div className="overflow-hidden mb-6">
            <motion.h1
              initial={{ opacity: 0, filter: 'blur(8px)', y: 30 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-forno-text-primary tracking-tight leading-[1.1]"
              style={{ fontFamily: 'Inter' }}
            >
              Fire. Dough. Perfection.
            </motion.h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg text-forno-text-secondary max-w-xl mx-auto mb-10"
          >
            Artisanal pizzas crafted to order, fired to perfection, delivered to your door.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/dashboard" className="px-8 py-4 text-base font-semibold text-white accent-gradient rounded-button hover:brightness-110 transition-all shadow-glow-amber">
              Order Now
            </Link>
            <Link to="/dashboard/builder" className="px-8 py-4 text-base font-semibold text-forno-text-primary border border-forno-text-primary/30 rounded-button hover:bg-white/5 hover:border-[#FF6B35] transition-all">
              Build Your Pizza
            </Link>
          </motion.div>
        </div>

        {scrollIndicatorVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{ y: { duration: 2, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.5, delay: 1.2 } }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-forno-text-muted"
          >
            <ChevronDown size={24} />
          </motion.div>
        )}
      </section>

      {/* Featured Pizzas */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <p className="text-xs uppercase tracking-[0.1em] text-forno-text-muted mb-3">Signature Creations</p>
            <h2 className="text-3xl lg:text-4xl font-semibold text-forno-text-primary mb-3">Crafted by Fire</h2>
            <p className="text-forno-text-secondary max-w-md">Our most-loved pizzas, each made with premium ingredients and wood-fired passion.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPizzas.map((pizza, i) => (
              <motion.div
                key={pizza.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-card overflow-hidden group cursor-pointer hover:border-[#FF6B35]/20 transition-all duration-300"
                style={{ perspective: '1000px' }}
              >
                <div className="overflow-hidden aspect-[4/3]">
                  <img
                    src={pizza.imageUrl}
                    alt={pizza.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-forno-text-primary mb-1">{pizza.name}</h3>
                  <p className="text-sm text-forno-text-secondary mb-3 line-clamp-2">{pizza.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono font-semibold text-forno-text-primary">From ₹{pizza.price}</span>
                    <Link to="/dashboard" className="px-4 py-2 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all">
                      Order
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-28 bg-forno-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs uppercase tracking-[0.1em] text-forno-text-muted mb-3">How It Works</p>
            <h2 className="text-3xl lg:text-4xl font-semibold text-forno-text-primary">Your Pizza Journey</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connection line - desktop */}
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-forno-bg-tertiary">
              <motion.div
                initial={{ width: '0%' }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full accent-gradient"
              />
            </div>

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex flex-col items-center text-center relative z-10"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: i * 0.15 }}
                  className="w-20 h-20 rounded-full bg-forno-bg-tertiary border border-forno-border flex items-center justify-center mb-4"
                >
                  <step.icon size={28} className="text-[#FF6B35]" />
                </motion.div>
                <span className="text-sm font-mono text-forno-text-muted mb-1">{step.num}</span>
                <h4 className="text-lg font-semibold text-forno-text-primary mb-2">{step.title}</h4>
                <p className="text-sm text-forno-text-secondary max-w-[240px]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 relative noise-overlay">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl lg:text-5xl font-semibold mb-2" style={{ background: 'linear-gradient(135deg, #FF6B35, #F7931E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {stat.isDecimal ? <CountUp target={stat.value * 10} suffix="" duration={1500} /> : <CountUp target={stat.value} suffix={stat.suffix} />}
                  {stat.isDecimal && <span>.9</span>}
                </div>
                <p className="text-xs uppercase tracking-[0.08em] text-forno-text-muted">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
