import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Phone, MapPin, Plus, Trash2, Star, Save, Pencil, X } from 'lucide-react';
import { userApi, type ProfileAddress } from '@/services/api';
import DeliveryMap, { type MapLocation } from '@/components/shared/DeliveryMap';
import { hasCoords } from '@/lib/route';
import { useToast } from '@/components/shared/Toaster';

const emptyAddress: ProfileAddress = { label: 'Home', street: '', city: '', state: '', pincode: '', isDefault: false };

export default function ProfilePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<ProfileAddress[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ProfileAddress>(emptyAddress);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const res = await userApi.getMe();
      if (res.success) {
        setName(res.data.user.name ?? '');
        setPhone(res.data.user.phone ?? '');
        setAddresses(res.data.user.addresses ?? []);
      }
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast('Name cannot be empty', 'warning'); return; }
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ name: name.trim(), phone: phone.trim(), addresses });
      if (res.success) {
        setAddresses(res.data.user.addresses ?? addresses);
        toast(res.message || 'Profile saved');
      } else {
        toast(res.message || 'Could not save profile', 'error');
      }
    } catch {
      toast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setDraft(emptyAddress);
    setEditIndex(null);
    setShowForm(true);
  };

  const openEdit = (idx: number) => {
    setDraft({ ...addresses[idx] });
    setEditIndex(idx);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditIndex(null);
    setDraft(emptyAddress);
  };

  const saveAddress = () => {
    // A street is always required; city is only required when the address
    // wasn't pinned on the map (Nominatim may not return a city in rural areas).
    const pinned = hasCoords(draft.lat, draft.lng);
    if (!draft.street.trim() || (!draft.city.trim() && !pinned)) {
      toast(pinned ? 'Street address is required' : 'Street and city are required', 'warning');
      return;
    }
    if (editIndex !== null) {
      setAddresses(addresses.map((a, i) => (i === editIndex ? { ...draft } : a)));
      toast('Address updated');
    } else {
      const next = [...addresses, { ...draft }];
      if (!next.some(a => a.isDefault)) next[0].isDefault = true;
      setAddresses(next);
      toast('Address added');
    }
    closeForm();
  };

  const removeAddress = (idx: number) => {
    const next = addresses.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some(a => a.isDefault)) next[0].isDefault = true;
    setAddresses(next);
  };

  const setDefault = (idx: number) => {
    setAddresses(addresses.map((a, i) => ({ ...a, isDefault: i === idx })));
  };

  // The map picker fills address fields + coordinates automatically.
  const handleMapPick = (loc: MapLocation) => {
    setDraft(p => ({ ...p, street: loc.street, city: loc.city, state: loc.state, pincode: loc.pincode, lat: loc.lat, lng: loc.lng }));
  };

  const mapValue: MapLocation | null =
    hasCoords(draft.lat, draft.lng)
      ? { lat: draft.lat!, lng: draft.lng!, street: draft.street, city: draft.city, state: draft.state, pincode: draft.pincode }
      : null;

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12">
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-[#FF6B35]/30 border-t-[#FF6B35] rounded-full animate-spin" /></div>
      </div>
    );
  }

  const inputCls = "w-full bg-forno-bg-tertiary border border-forno-border rounded-lg px-4 py-2.5 text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 text-sm";

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
      <h2 className="text-2xl font-semibold text-forno-text-primary mb-6">My Profile</h2>

      <div className="space-y-6">
        {/* Contact details */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="flex items-center gap-2 font-semibold text-forno-text-primary mb-1"><UserIcon size={16} className="text-[#FF6B35]" /> Contact details</h3>
          <p className="text-xs text-forno-text-muted mb-5">
            Your phone number is shared with the delivery rider so they can reach you about your order.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs text-forno-text-muted mb-1">Full name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs text-forno-text-muted mb-1 flex items-center gap-1"><Phone size={12} /> Phone number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
            </div>
          </div>
        </motion.div>

        {/* Saved addresses */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="flex items-center gap-2 font-semibold text-forno-text-primary"><MapPin size={16} className="text-[#FF6B35]" /> Saved addresses</h3>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium accent-gradient text-white rounded-pill hover:brightness-110 transition-all">
              <Plus size={13} /> Add address
            </button>
          </div>
          <p className="text-xs text-forno-text-muted mb-4">Pick a saved address at checkout — it pre-fills the delivery details and helps estimate the delivery time.</p>

          {showForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-forno-bg-tertiary/50 border border-forno-border rounded-lg p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-forno-text-primary">{editIndex !== null ? 'Edit address' : 'New address'}</p>
                <button onClick={closeForm} className="text-forno-text-muted hover:text-forno-text-primary"><X size={16} /></button>
              </div>
              <DeliveryMap value={mapValue} onChange={handleMapPick} height={240} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Label</label>
                  <input type="text" value={draft.label} onChange={e => setDraft(p => ({ ...p, label: e.target.value }))} className={inputCls} placeholder="Home / Work" />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">Pincode</label>
                  <input type="text" value={draft.pincode} onChange={e => setDraft(p => ({ ...p, pincode: e.target.value }))} className={inputCls} placeholder="560001" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-forno-text-muted mb-1">Street address</label>
                <input type="text" value={draft.street} onChange={e => setDraft(p => ({ ...p, street: e.target.value }))} className={inputCls} placeholder="Flat, building, street" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">City</label>
                  <input type="text" value={draft.city} onChange={e => setDraft(p => ({ ...p, city: e.target.value }))} className={inputCls} placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs text-forno-text-muted mb-1">State</label>
                  <input type="text" value={draft.state} onChange={e => setDraft(p => ({ ...p, state: e.target.value }))} className={inputCls} placeholder="State" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={closeForm} className="flex-1 py-2 text-sm text-forno-text-secondary border border-forno-border rounded-button hover:text-forno-text-primary transition-all">Cancel</button>
                <button onClick={saveAddress} className="flex-1 py-2 text-sm font-medium accent-gradient text-white rounded-button hover:brightness-110 transition-all">
                  {editIndex !== null ? 'Save changes' : 'Save address'}
                </button>
              </div>
            </motion.div>
          )}

          {addresses.length === 0 && !showForm && (
            <p className="text-sm text-forno-text-muted py-2">No saved addresses yet — add one to make checkout faster.</p>
          )}
          <div className="space-y-2.5">
            {addresses.map((a, i) => (
              <div key={i} className="flex items-start gap-3 bg-forno-bg-tertiary/50 border border-forno-border rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-forno-text-primary">{a.label || 'Address'}</span>
                    {a.isDefault && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#7CB342]/15 text-[#7CB342] rounded text-[10px] font-semibold"><Star size={9} /> Default</span>
                    )}
                  </div>
                  <p className="text-xs text-forno-text-secondary truncate">{a.street}, {a.city} {a.state} — {a.pincode}</p>
                  {hasCoords(a.lat, a.lng) && (
                    <p className="text-[10px] font-mono text-forno-text-muted mt-0.5">{a.lat?.toFixed(4)}, {a.lng?.toFixed(4)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!a.isDefault && (
                    <button onClick={() => setDefault(i)} title="Set as default" className="p-1.5 text-forno-text-muted hover:text-[#FF6B35] transition-colors"><Star size={14} /></button>
                  )}
                  <button onClick={() => openEdit(i)} title="Edit address" className="p-1.5 text-forno-text-muted hover:text-[#FF6B35] transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => removeAddress(i)} title="Remove" className="p-1.5 text-forno-text-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <button onClick={handleSave} disabled={saving}
          className="w-full sm:w-auto px-8 py-3 accent-gradient rounded-button text-white font-semibold hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> Save profile</>}
        </button>
      </div>
    </div>
  );
}
