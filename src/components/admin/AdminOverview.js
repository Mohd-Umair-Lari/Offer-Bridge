"use client";

import { DollarSign, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatCard from '@/components/shared/StatCard';

const CATEGORIES = ['Electronics', 'Fashion & Clothing', 'Beauty & Skincare', 'Footwear', 'Mobile & Tablets'];
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

// Fake monthly trend data for visual richness
const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
function buildTrend(reqs) {
  return MONTHS.map((m, i) => ({ month: m, volume: Math.round((reqs.length + i * 3) * 2800 + Math.random() * 15000) }));
}

const PIE_COLORS = { pending: '#f59e0b', matched: '#3b82f6', completed: '#10b981' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', boxShadow: 'var(--shadow-md)' }}>
      <p className="font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  );
};

export default function AdminOverview({ requests, offers, transactions }) {
  const reqs  = requests     || [];
  const offs  = offers       || [];
  const txs   = transactions || [];

  const totalVolume  = reqs.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalFees    = txs.reduce((s, t) => s + Number(t.platform_fee || 0), 0);
  const openDisputes = 0; // Disputes feature has been sunset
  const heldEscrow   = txs.filter(t => t.status === 'tracking_pending').reduce((s, t) => s + Number(t.amount || 0), 0);

  const stats = [
    { label: 'Total Volume',   value: `₹${totalVolume.toLocaleString('en-IN')}`,  sub: 'all time',       icon: TrendingUp,   iconClass: 'stat-purple',  delay: 0 },
    { label: 'Platform Fees',  value: `₹${totalFees.toLocaleString('en-IN')}`,    sub: 'collected',      icon: DollarSign,   iconClass: 'stat-success', delay: 0.08 },
    { label: 'Escrow Held',    value: `₹${heldEscrow.toLocaleString('en-IN')}`,   sub: 'held currently', icon: ShieldCheck,  iconClass: 'stat-warning', delay: 0.16 },
    { label: 'Open Disputes',  value: openDisputes,                               sub: 'feature sunset', icon: AlertTriangle,iconClass: 'stat-danger',  delay: 0.24 },
  ];

  const trendData = buildTrend(reqs);

  const catData = CATEGORIES.map(cat => ({
    cat,
    count:  reqs.filter(r => r.category === cat).length,
    volume: reqs.filter(r => r.category === cat).reduce((s, r) => s + Number(r.amount || 0), 0),
  }));
  const maxVolume = Math.max(...catData.map(d => d.volume), 1);

  const pieData = [
    { name: 'Pending',   value: reqs.filter(r => r.status === 'pending').length,   color: PIE_COLORS.pending },
    { name: 'Matched',   value: reqs.filter(r => r.status === 'matched').length,   color: PIE_COLORS.matched },
    { name: 'Completed', value: reqs.filter(r => r.status === 'completed').length, color: PIE_COLORS.completed },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Platform Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Real-time metrics · {reqs.length} requests · {offs.length} offers
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Charts row */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Area chart — volume trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="card p-5 md:col-span-2">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Volume Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border2)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-dim)' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" stroke="#8b5cf6" strokeWidth={2.5}
                fill="url(#purpleGrad)" dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart — status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card p-5">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Request Status</h2>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                </div>
                <span className="font-bold" style={{ color: 'var(--text)' }}>{p.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Category breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        className="card p-5">
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Volume by Category</h2>
        <div className="space-y-4">
          {catData.map((d, i) => (
            <div key={d.cat}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{d.cat}</span>
                <span className="font-bold" style={{ color: 'var(--text)' }}>₹{d.volume.toLocaleString('en-IN')}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.volume / maxVolume) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                  style={{ background: 'linear-gradient(90deg, var(--primary) 0%, #a78bfa 100%)' }} />
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{d.count} requests</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent requests */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Recent Requests</h2>
        </div>
        <div>
          {reqs.slice(0, 5).map((r, i) => (
            <motion.div key={r.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
              className="px-5 py-3.5 flex items-center gap-4 text-sm transition"
              style={{ borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{r.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{r.category}</p>
              </div>
              <p className="font-bold tabular-nums" style={{ color: 'var(--text)' }}>₹{Number(r.amount).toLocaleString('en-IN')}</p>
              <span className={`badge ${r.status === 'pending' ? 'badge-warning' : r.status === 'matched' ? 'badge-info' : 'badge-success'} capitalize`}>
                {r.status}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
