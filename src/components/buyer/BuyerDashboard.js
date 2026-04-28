"use client";
import { motion } from 'framer-motion';
import { TrendingDown, CheckCircle2, Clock, Tag, ArrowUpRight, Plus } from 'lucide-react';
import { useState } from 'react';
import RequestDetailsModal from '@/components/shared/RequestDetailsModal';
import StatCard from '@/components/shared/StatCard';

const STATUS_STYLES = {
  pending:   'badge badge-warning',
  matched:   'badge badge-info',
  completed: 'badge badge-success',
};

const CATEGORY_COLORS = {
  Electronics: '#8b5cf6', 'Fashion & Clothing': '#ec4899', 'Beauty & Skincare': '#f43f5e',
  'Home & Kitchen': '#f97316', 'Books & Stationery': '#eab308', 'Sports & Fitness': '#22c55e',
  Groceries: '#84cc16', 'Health & Wellness': '#14b8a6', Footwear: '#f59e0b',
  Accessories: '#06b6d4', Gaming: '#6366f1', 'Mobile & Tablets': '#3b82f6', Appliances: '#0ea5e9',
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function BuyerDashboard({ requests = [] }) {
  const [selectedReq, setSelectedReq] = useState(null);

  const pending   = requests.filter(r => r.status === 'pending').length;
  const matched   = requests.filter(r => r.status === 'matched').length;
  const completed = requests.filter(r => r.status === 'completed').length;
  const saved     = requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount * 0.12, 0);

  const stats = [
    { label: 'Pending',    value: pending,                                 sub: 'awaiting match',    icon: Clock,        iconClass: 'stat-warning', delay: 0 },
    { label: 'Matched',    value: matched,                                 sub: 'in progress',        icon: ArrowUpRight, iconClass: 'stat-info',    delay: 0.08 },
    { label: 'Completed',  value: completed,                               sub: 'successful deals',   icon: CheckCircle2, iconClass: 'stat-success', delay: 0.16 },
    { label: 'Total Saved',value: `₹${saved.toLocaleString('en-IN')}`,   sub: 'est. discount value',icon: TrendingDown, iconClass: 'stat-purple',  delay: 0.24 },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {selectedReq && <RequestDetailsModal req={selectedReq} onClose={() => setSelectedReq(null)} />}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Buyer Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Track your purchase requests and savings</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Recent Requests */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Recent Requests</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{requests.length} total</p>
          </div>
          <span className="badge badge-neutral">{pending} pending</span>
        </div>

        <div>
          {requests.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 stat-purple">
                <Tag size={24} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No requests yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Create your first request to get started</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="visible">
              {requests.slice(0, 6).map((req, i) => (
                <motion.div key={req.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="px-5 py-3.5 flex items-center gap-4 group transition"
                  style={{ borderBottom: '1px solid var(--border2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CATEGORY_COLORS[req.category] || 'var(--border)', boxShadow: `0 0 8px ${CATEGORY_COLORS[req.category] || 'transparent'}60` }} />
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ background: `${CATEGORY_COLORS[req.category] || '#6b7280'}15`, color: CATEGORY_COLORS[req.category] || 'var(--text-muted)', border: `1px solid ${CATEGORY_COLORS[req.category] || '#6b7280'}25` }}>
                    {req.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate transition" style={{ color: 'var(--text)' }}>{req.title}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      Due {new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--text)' }}>
                    ₹{req.amount.toLocaleString('en-IN')}
                  </p>
                  <span className={STATUS_STYLES[req.status] || 'badge badge-neutral'}>{req.status}</span>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedReq(req)}
                    className="btn-ghost text-xs px-3 py-1.5 shrink-0">
                    Details
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
