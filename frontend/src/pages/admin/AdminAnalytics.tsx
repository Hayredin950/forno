import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi } from '@/services/mockApi'; // Keep using mockApi for dashboard analytics for now

const PIE_COLORS = ['#F7931E', '#FF6B35', '#7CB342', '#4CAF50', '#E53935'];

export default function AdminAnalytics() {
  const [revenueData, setRevenueData] = useState<{ name: string; revenue: number }[]>([]);
  const [popularData, setPopularData] = useState<{ name: string; count: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ name: string; orders: number }[]>([]);
  const [activePeriod, setActivePeriod] = useState('7D');

  useEffect(() => { loadData(); }, [activePeriod]);

  const loadData = async () => {
    const days = activePeriod === '7D' ? 7 : activePeriod === '30D' ? 30 : 90;
    const [rev, pop, stat, hour] = await Promise.all([
      dashboardApi.getRevenueChart(days),
      dashboardApi.getPopularPizzas(),
      dashboardApi.getStatusDistribution(),
      dashboardApi.getHourlyOrders(),
    ]);
    setRevenueData(rev.data.labels.map((l, i) => ({ name: l, revenue: rev.data.data[i] })));
    setPopularData(pop.data);
    setStatusData(stat.data);
    setHourlyData(hour.data.labels.map((l, i) => ({ name: l, orders: hour.data.data[i] })));
  };

  const periods = ['7D', '30D', '90D'];

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-forno-text-primary">Revenue Overview</h3>
          <div className="flex gap-1">
            {periods.map(p => (
              <button key={p} onClick={() => setActivePeriod(p)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${activePeriod === p ? 'bg-[#FF6B35]/15 text-[#FF6B35]' : 'text-forno-text-muted hover:text-forno-text-primary'}`}>{p}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueData}>
            <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B35" stopOpacity={0.3} /><stop offset="100%" stopColor="#FF6B35" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="name" tick={{ fill: '#6B6258', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B6258', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
            <Tooltip contentStyle={{ background: '#16120F', border: '1px solid rgba(245,241,234,0.08)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#F5F1EA' }} formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} fill="url(#revGrad)" animationDuration={1000} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Pizzas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="font-semibold text-forno-text-primary mb-4">Most Ordered Pizzas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={popularData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6B6258', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#A39A8E', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ background: '#16120F', border: '1px solid rgba(245,241,234,0.08)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#F5F1EA' }} />
              <Bar dataKey="count" fill="#FF6B35" radius={[0, 4, 4, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h3 className="font-semibold text-forno-text-primary mb-4">Order Status</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="60%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" animationDuration={1000}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-forno-text-secondary">{s.name}</span>
                  <span className="text-xs font-mono text-forno-text-primary ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hourly Orders */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h3 className="font-semibold text-forno-text-primary mb-4">Orders by Hour</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hourlyData}>
            <XAxis dataKey="name" tick={{ fill: '#6B6258', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B6258', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#16120F', border: '1px solid rgba(245,241,234,0.08)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: '#F5F1EA' }} />
            <Bar dataKey="orders" fill="#FF6B35" radius={[4, 4, 0, 0]} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
