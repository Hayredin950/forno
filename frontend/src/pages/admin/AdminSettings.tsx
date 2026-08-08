import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Mail, Phone, MapPin, AtSign, Share2, Globe, Users, Tag } from 'lucide-react';
import { adminSettingsApi, type SiteConfigData } from '@/services/api';
import DeliveryMap, { type MapLocation } from '@/components/shared/DeliveryMap';
import { useToast } from '@/components/shared/Toaster';

// Combine a map picker result into a single human-readable address line.
const joinAddress = (loc: MapLocation): string =>
  [
    loc.street,
    [loc.city, loc.state].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ') + (loc.pincode ? ` — ${loc.pincode}` : '');

const EMPTY: SiteConfigData = {
  contactPhone: '',
  supportEmail: '',
  social: { instagram: '', twitter: '', facebook: '' },
  deliveryOrigin: { label: 'Forno Kitchen', address: '', lat: 0, lng: 0 },
  pricing: { customBasePrice: 200, taxRate: 0.05, deliveryFee: 40, freeDeliveryThreshold: 500 },
};

export default function AdminSettings() {
  const [form, setForm] = useState<SiteConfigData>(EMPTY);
  const [subscribers, setSubscribers] = useState<{ email: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [cfgRes, subRes] = await Promise.all([
          adminSettingsApi.get(),
          adminSettingsApi.listSubscribers(),
        ]);
        if (cfgRes.success) setForm(cfgRes.data);
        if (subRes.success) setSubscribers(subRes.data);
      } catch {
        toast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = <K extends keyof SiteConfigData>(key: K, value: SiteConfigData[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Guard against NaN coordinates from cleared/invalid number inputs.
      const clean = {
        ...form,
        deliveryOrigin: {
          ...form.deliveryOrigin,
          lat: Number.isFinite(form.deliveryOrigin.lat) ? form.deliveryOrigin.lat : 0,
          lng: Number.isFinite(form.deliveryOrigin.lng) ? form.deliveryOrigin.lng : 0,
        },
      };
      const res = await adminSettingsApi.save(clean);
      setForm(clean);
      toast(res.success ? (res.message ?? 'Settings saved') : 'Failed to save settings', res.success ? 'success' : 'error');
    } catch {
      toast('Something went wrong while saving', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-[#FF6B35]/30 border-t-[#FF6B35] rounded-full animate-spin" /></div>;
  }

  const inputCls = "w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary text-sm focus:outline-none focus:border-[#FF6B35]/50";
  const labelCls = "block text-xs text-forno-text-muted mb-1";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-forno-text-primary">Site Settings</h2>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 accent-gradient text-white rounded-button hover:brightness-110 transition-all disabled:opacity-60">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <p className="text-sm text-forno-text-secondary mb-8 -mt-3">
        Everything here controls what customers see in the footer, on the checkout page and in delivery tracking — saved instantly to the database.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Business info */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Phone size={16} className="text-[#FF6B35]" />
            <h3 className="font-semibold text-forno-text-primary">Business Contact</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Phone (shown in footer)</label>
              <input type="tel" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Support Email</label>
              <input type="email" value={form.supportEmail} onChange={e => set('supportEmail', e.target.value)} placeholder="hello@forno.pizza" className={inputCls} />
            </div>
          </div>
        </motion.div>

        {/* Social links */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-[#FF6B35]" />
            <h3 className="font-semibold text-forno-text-primary">Social Links</h3>
          </div>
          <p className="text-xs text-forno-text-muted mb-4">Paste a full link (https://instagram.com/forno) or just a handle (@forno) — the footer resolves it.</p>
          <div className="space-y-4">
            {([
              { key: 'instagram', label: 'Instagram', icon: AtSign },
              { key: 'twitter', label: 'Twitter / X', icon: Share2 },
              { key: 'facebook', label: 'Facebook', icon: Globe },
            ] as const).map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className={labelCls}><Icon size={11} className="inline mr-1" />{label}</label>
                <input type="text" value={form.social[key]} onChange={e => set('social', { ...form.social, [key]: e.target.value })} placeholder="@fornopizza or https://..." className={inputCls} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Delivery origin */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={16} className="text-[#FF6B35]" />
            <h3 className="font-semibold text-forno-text-primary">Delivery Origin (Kitchen Location)</h3>
          </div>
          <p className="text-xs text-forno-text-muted mb-4">Where the kitchen is. Delivery tracking measures from here to the customer's address.</p>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Label</label>
              <input type="text" value={form.deliveryOrigin.label} onChange={e => set('deliveryOrigin', { ...form.deliveryOrigin, label: e.target.value })} placeholder="Forno Kitchen" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input type="text" value={form.deliveryOrigin.address} onChange={e => set('deliveryOrigin', { ...form.deliveryOrigin, address: e.target.value })} placeholder="12 Wood-Fired Lane, Mumbai" className={inputCls} />
            </div>
            {/* Pick the kitchen on the map — the same picker customers see at
                checkout. Search, drag the pin, or use your device location;
                address + coordinates fill in automatically. */}
            <DeliveryMap
              value={form.deliveryOrigin.lat !== 0 || form.deliveryOrigin.lng !== 0
                ? {
                    lat: form.deliveryOrigin.lat,
                    lng: form.deliveryOrigin.lng,
                    street: form.deliveryOrigin.address.split(' — ')[0] ?? '',
                    city: '',
                    state: '',
                    pincode: form.deliveryOrigin.address.split(' — ')[1] ?? '',
                  }
                : null}
              onChange={(loc) => set('deliveryOrigin', {
                ...form.deliveryOrigin,
                lat: loc.lat,
                lng: loc.lng,
                address: joinAddress(loc),
              })}
              height={260}
              instruction={<>Pin the <span className="text-[#FF6B35]">kitchen location</span> on the map, or search above. Delivery time is calculated from here to the customer's address.</>}
            />
          </div>
        </motion.div>

        {/* Pricing */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Tag size={16} className="text-[#FF6B35]" />
            <h3 className="font-semibold text-forno-text-primary">Pricing &amp; Fees</h3>
          </div>
          <p className="text-xs text-forno-text-muted mb-4">Applied instantly to checkout, order totals and the custom-pizza builder.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Custom pizza base (₹)</label>
              <input type="number" min={0} value={form.pricing.customBasePrice} onChange={e => set('pricing', { ...form.pricing, customBasePrice: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tax rate (%)</label>
              <input type="number" min={0} step="any" value={form.pricing.taxRate * 100} onChange={e => set('pricing', { ...form.pricing, taxRate: Number(e.target.value) / 100 })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Delivery fee (₹)</label>
              <input type="number" min={0} value={form.pricing.deliveryFee} onChange={e => set('pricing', { ...form.pricing, deliveryFee: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Free delivery above (₹)</label>
              <input type="number" min={0} value={form.pricing.freeDeliveryThreshold} onChange={e => set('pricing', { ...form.pricing, freeDeliveryThreshold: Number(e.target.value) })} className={inputCls} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Subscribers */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-[#FF6B35]" />
          <h3 className="font-semibold text-forno-text-primary">Newsletter Subscribers</h3>
          <span className="ml-auto px-2 py-0.5 bg-[#FF6B35]/10 text-[#FF6B35] rounded-pill text-xs font-semibold">{subscribers.length}</span>
        </div>
        {subscribers.length === 0 ? (
          <p className="text-sm text-forno-text-muted py-2">No subscribers yet — the footer form stores sign-ups here.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {subscribers.map(s => (
              <div key={s.email} className="flex items-center gap-3 bg-forno-bg-tertiary/60 border border-forno-border rounded-lg px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-forno-bg-tertiary flex items-center justify-center text-xs font-bold text-[#FF6B35] uppercase shrink-0">{s.email[0]}</div>
                <div className="min-w-0">
                  <p className="text-sm text-forno-text-primary truncate">{s.email}</p>
                  <p className="text-[11px] text-forno-text-muted">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
