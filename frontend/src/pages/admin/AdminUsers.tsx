import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldCheck, ShieldOff, Trash2, Users } from 'lucide-react';
import { adminUserApi } from '@/services/api';
import { useToast } from '@/components/shared/Toaster';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
  isActive: boolean;
  googleId: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadUsers(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => { loadUsers(); }, [page]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    setLoading(true);
    const res = await adminUserApi.getAll({ search, page, limit: 15 });
    setUsers(res.data.users);
    setTotal(res.data.total);
    setPages(res.data.pages);
    setLoading(false);
  };

  const handleToggle = async (id: string) => {
    const res = await adminUserApi.toggleActive(id);
    toast(res.message);
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? Their orders will remain but the account will be removed.')) return;
    const res = await adminUserApi.remove(id);
    toast(res.message);
    loadUsers();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-forno-text-muted" />
          <h2 className="text-xl font-semibold text-forno-text-primary">User Management</h2>
        </div>
        <span className="text-xs text-forno-text-muted">{total} registered user{total === 1 ? '' : 's'}</span>
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forno-text-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 pr-4 py-2 bg-forno-bg-tertiary border border-forno-border rounded-lg text-sm text-forno-text-primary placeholder:text-forno-text-muted focus:outline-none focus:border-[#FF6B35]/50 w-64" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-forno-bg-tertiary">
                {['Name', 'Email', 'Verified', 'Sign-in', 'Status', 'Joined', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-[0.06em] text-forno-text-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-forno-border last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 text-sm text-forno-text-primary font-medium">{u.name}</td>
                  <td className="px-4 py-3.5 text-sm text-forno-text-secondary">{u.email}</td>
                  <td className="px-4 py-3.5">
                    {u.isVerified
                      ? <span className="px-2 py-0.5 bg-forno-status-success/15 text-forno-status-success rounded text-[11px] font-semibold">Verified</span>
                      : <span className="px-2 py-0.5 bg-forno-status-warning/15 text-forno-status-warning rounded text-[11px] font-semibold">Unverified</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-forno-text-muted">{u.googleId ? 'Google' : 'Email'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${u.isActive ? 'bg-forno-status-success/15 text-forno-status-success' : 'bg-forno-accent-red/15 text-forno-accent-red'}`}>
                      {u.isActive ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-forno-text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggle(u._id)} title={u.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-lg border border-forno-border transition-all ${u.isActive ? 'text-forno-text-muted hover:text-forno-accent-red hover:border-red-500/30' : 'text-forno-status-success hover:border-green-500/30'}`}>
                        {u.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      </button>
                      <button onClick={() => handleDelete(u._id)} title="Delete user"
                        className="p-2 rounded-lg border border-forno-border text-forno-text-muted hover:text-red-500 hover:border-red-500/30 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-forno-text-muted">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-forno-border">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 text-forno-text-muted hover:text-forno-text-primary disabled:opacity-40">← Prev</button>
            <span className="text-sm font-mono text-forno-text-muted">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 text-forno-text-muted hover:text-forno-text-primary disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
