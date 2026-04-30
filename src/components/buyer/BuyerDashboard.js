"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, CheckCircle2, Clock, Tag, ArrowUpRight, CreditCard,
  AlertCircle, Zap, Activity, ShoppingBag, Calendar, ExternalLink,
  RefreshCw, Eye, ChevronRight, Sparkles, Package,
} from 'lucide-react';
import RequestDetailsModal from '@/components/shared/RequestDetailsModal';
import StatCard from '@/components/shared/StatCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const STATUS_META = {
  pending:          { label: 'Pending',   cls: 'badge-warning', dot: '#f59e0b' },
  matched:          { label: 'Matched',   cls: 'badge-info',    dot: '#3b82f6' },
  completed:        { label: 'Completed', cls: 'badge-success', dot: '#10b981' },
  pending_payment:  { label: 'Pay Now',   cls: 'badge-danger',  dot: '#ef4444' },
  tracking_pending: { label: 'In Transit',cls: 'badge-cyan',    dot: '#06b6d4' },
  refunded:         { label: 'Refunded',  cls: 'badge-neutral', dot: '#6b7280' },
};

const CATEGORY_COLORS = {
  Electronics: '#8b5cf6', 'Fashion & Clothing': '#ec4899', 'Beauty & Skincare': '#f43f5e',
  'Home & Kitchen': '#f97316', 'Books & Stationery': '#eab308', 'Sports & Fitness': '#22c55e',
  Groceries: '#84cc16', 'Health & Wellness': '#14b8a6', Footwear: '#f59e0b',
  Accessories: '#06b6d4', Gaming: '#6366f1', 'Mobile & Tablets': '#3b82f6', Appliances: '#0ea5e9',
  Other: '#8b5cf6',
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ── Pay Now Alert Banner ───────────────────────────────────────────
function PayBanner({ tx, onPay, onDismiss }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.14) 0%,rgba(6,182,212,0.06) 100%)', border: '1px solid rgba(139,92,246,0.35)' }}>

      {/* Animated shimmer */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.03) 50%,transparent 60%)', backgroundSize: '200% 100%', animation: 'shimmer 3s infinite' }} />

      <motion.div
        animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity }}
        className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)', boxShadow: '0 6px 20px rgba(139,92,246,0.4)' }}>
        <CreditCard size={18} className="text-white" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="live-dot-amber" />
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#f59e0b' }}>Action Required</p>
        </div>
        <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
          A provider matched your request — complete your escrow payment
        </p>
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--primary)' }}>{tx.product_title}</span>
          {' · '}₹{Number(tx.amount).toLocaleString('en-IN')}
          {tx.provider_name && <> · by {tx.provider_name}</>}
        </p>
      </div>

      <motion.button
        id={`pay-now-${tx.id || tx._id}`}
        onClick={() => onPay(tx)}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
        className="shrink-0 btn-primary text-sm px-5 py-2.5">
        <Zap size={14} /> Pay ₹{Number(tx.amount).toLocaleString('en-IN')}
      </motion.button>
    </motion.div>
  );
}

// ── Request row ────────────────────────────────────────────────────
function RequestRow({ req, index, onViewDetails }) {
  const color = CATEGORY_COLORS[req.category] || '#8b5cf6';
  const meta  = STATUS_META[req.status] || { label: req.status, cls: 'badge-neutral', dot: '#6b7280' };
  return (
    <motion.div
      variants={item}
      className="flex items-center gap-4 px-5 py-4 group transition-all cursor-default"
      style={{ borderBottom: '1px solid var(--border2)' }}
      whileHover={{ background: 'var(--surface2)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      {/* Category dot */}
      <div className="w-3 h-3 rounded-full shrink-0"
        style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />

      {/* Category badge */}
      <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
        {req.category}
      </span>

      {/* Title + deadline */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{req.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
            <Calendar size={10} />
            {new Date(req.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {req.product_link && (
            <a href={req.product_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] hover:underline"
              style={{ color: 'var(--primary)' }}>
              <ExternalLink size={9} /> Link
            </a>
          )}
        </div>
      </div>

      {/* Amount */}
      <p className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--text)' }}>
        ₹{Number(req.amount).toLocaleString('en-IN')}
      </p>

      {/* Status */}
      <span className={`badge ${meta.cls} shrink-0`} style={{ gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
        {meta.label}
      </span>

      {/* Details */}
      <motion.button
        onClick={() => onViewDetails(req)}
        whileHover={{ scale: 1.06, x: 2 }} whileTap={{ scale: 0.94 }}
        className="shrink-0 p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100"
        style={{ color: 'var(--primary)', background: 'var(--primary-dim)' }}>
        <Eye size={13} />
      </motion.button>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function BuyerDashboard({ requests = [], onPaymentAction, refreshKey = 0 }) {
  const { user } = useAuth();
  const [selectedReq, setSelectedReq] = useState(null);
  const [pendingTxs, setPendingTxs]   = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchPendingTxs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getTransactions(user.id);
      setPendingTxs((res.data || []).filter(t => t.status === 'pending_payment'));
      setLastUpdated(new Date());
    } catch { /* ignore */ }
  }, [user?.id]);

  // Re-fetch on mount, refreshKey change, and every 20 seconds
  useEffect(() => {
    fetchPendingTxs();
    pollRef.current = setInterval(fetchPendingTxs, 20_000);
    return () => clearInterval(pollRef.current);
  }, [fetchPendingTxs, refreshKey]);

  const handlePay = (tx) => { if (onPaymentAction) onPaymentAction(tx.id || tx._id, tx); };

  // ── Computed stats ──────────────────────────────────────────────
  const pending      = requests.filter(r => r.status === 'pending').length;
  const matched      = requests.filter(r => r.status === 'matched').length;
  const completed    = requests.filter(r => r.status === 'completed').length;
  const totalSpend   = requests.filter(r => r.status === 'completed').reduce((s, r) => s + Number(r.amount), 0);
  const totalSavings = Math.round(totalSpend * 0.12);

  const stats = [
    { label: 'Pending',      value: pending,                                    sub: 'awaiting match',       icon: Clock,        iconClass: 'stat-warning', delay: 0,    live: true },
    { label: 'Matched',      value: matched,                                    sub: 'provider assigned',    icon: ArrowUpRight, iconClass: 'stat-info',    delay: 0.07 },
    { label: 'Completed',    value: completed,                                  sub: 'successful deals',     icon: CheckCircle2, iconClass: 'stat-success', delay: 0.14 },
    { label: 'Est. Savings', value: `₹${totalSavings.toLocaleString('en-IN')}`,sub: 'via card discounts',   icon: TrendingDown, iconClass: 'stat-purple',  delay: 0.21 },
  ];

  // Time since last update
  const timeAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated) / 1000) < 60
      ? 'Just now'
      : `${Math.floor((Date.now() - lastUpdated) / 60000)}m ago`
    : '—';

  return (
    <div className="space-y-7 max-w-5xl">
      {selectedReq && <RequestDetailsModal req={selectedReq} onClose={() => setSelectedReq(null)} />}

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#10b981' }}>Live</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Buyer <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Track your purchase requests · Updated {timeAgo}
          </p>
        </div>
        <motion.button onClick={fetchPendingTxs}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition"
          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <RefreshCw size={13} /> Refresh
        </motion.button>
      </motion.div>

      {/* ── Pending Payment Banners ── */}
      <AnimatePresence mode="popLayout">
        {pendingTxs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} style={{ color: '#f59e0b' }} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#f59e0b' }}>
                {pendingTxs.length} Payment{pendingTxs.length > 1 ? 's' : ''} Awaiting Your Action
              </p>
            </div>
            {pendingTxs.map(tx => (
              <PayBanner key={tx.id || tx._id} tx={tx} onPay={handlePay} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat Cards ── */}
      <motion.div variants={container} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* ── Requests Table ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        className="card overflow-hidden">

        {/* Table header */}
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(139,92,246,0.04) 0%,transparent 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <ShoppingBag size={16} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>My Requests</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {requests.length} total · {pending} pending
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>Live sync</span>
          </div>
        </div>

        {/* Table body */}
        {requests.length === 0 ? (
          <div className="py-20 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--primary-dim)' }}>
              <Package size={28} style={{ color: 'var(--primary)' }} />
            </motion.div>
            <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>No requests yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Post your first request to get matched with a cardholder</p>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="visible">
            {requests.slice(0, 8).map((req, i) => (
              <RequestRow key={req.id} req={req} index={i} onViewDetails={setSelectedReq} />
            ))}
          </motion.div>
        )}

        {requests.length > 8 && (
          <div className="px-6 py-4 flex items-center justify-center"
            style={{ borderTop: '1px solid var(--border2)' }}>
            <button className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--primary)' }}>
              View all {requests.length} requests <ChevronRight size={13} />
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Activity Timeline ── */}
      {requests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
          className="card overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(6,182,212,0.04) 0%,transparent 100%)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <Activity size={16} style={{ color: '#06b6d4' }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Recent Activity</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Latest status changes</p>
            </div>
          </div>

          <div className="p-6 space-y-0">
            {requests.slice(0, 5).map((req, i) => {
              const color = CATEGORY_COLORS[req.category] || '#8b5cf6';
              const meta  = STATUS_META[req.status] || STATUS_META.pending;
              return (
                <motion.div key={req.id}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.44 + i * 0.06 }}
                  className="flex gap-4 relative">
                  {/* Timeline line */}
                  {i < Math.min(requests.length, 5) - 1 && (
                    <div className="absolute left-[14px] top-8 bottom-0 w-px" style={{ background: 'var(--border2)' }} />
                  )}
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-1 z-10"
                    style={{ background: `${color}18`, border: `2px solid ${color}50` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  </div>
                  <div className="pb-5 flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{req.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`badge ${meta.cls} text-[10px]`}>{meta.label}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>₹{Number(req.amount).toLocaleString('en-IN')}</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>· {req.category}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
