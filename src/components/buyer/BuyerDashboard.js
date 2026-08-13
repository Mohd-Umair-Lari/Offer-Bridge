"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, CheckCircle2, Clock, Tag, ArrowUpRight, CreditCard,
  AlertCircle, Zap, Activity, ShoppingBag, Calendar, ExternalLink,
  RefreshCw, Eye, ChevronRight, Sparkles, Package, Truck, Link as LinkIcon,
} from 'lucide-react';
import RequestDetailsModal from '@/components/shared/RequestDetailsModal';
import EditRequestModal from '@/components/shared/EditRequestModal';
import StatCard from '@/components/shared/StatCard';
import NotificationFeed from '@/components/shared/NotificationFeed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const STATUS_META = {
  pending:          { label: 'Pending',   cls: 'badge-warning', dot: '#f59e0b' },
  matched:          { label: 'Matched',   cls: 'badge-info',    dot: '#3b82f6' },
  completed:        { label: 'Completed', cls: 'badge-success', dot: '#10b981' },
  pending_payment:  { label: 'Pay Now',   cls: 'badge-danger',  dot: '#ef4444' },
  tracking_pending: { label: 'In Transit',cls: 'badge-cyan',    dot: '#06b6d4' },
  refunded:         { label: 'Refunded',  cls: 'badge-danger',  dot: '#ef4444' },
  cancelled:        { label: 'Cancelled', cls: 'badge-neutral', dot: '#6b7280' },
};

const CATEGORY_COLORS = {
  Electronics: '#3b82f6', 'Fashion & Clothing': '#ec4899', 'Beauty & Skincare': '#f43f5e',
  'Home & Kitchen': '#f97316', 'Books & Stationery': '#eab308', 'Sports & Fitness': '#22c55e',
  Groceries: '#84cc16', 'Health & Wellness': '#14b8a6', Footwear: '#f59e0b',
  Accessories: '#06b6d4', Gaming: '#6366f1', 'Mobile & Tablets': '#3b82f6', Appliances: '#0ea5e9',
  Other: '#71717a',
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function RefundedBanner({ req, onEdit, onDelete }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await onDelete(req);
    setLoading(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 overflow-hidden"
      style={{ background: 'var(--surface2)', border: '1px solid rgba(239,68,68,0.35)' }}>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
          <AlertCircle size={18} />
        </div>
        <div className="sm:hidden flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>Payment Refunded</p>
          <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--text)' }}>
            {req.title}
          </p>
        </div>
      </div>

      <div className="hidden sm:block flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>Payment Refunded (Deadline Missed)</p>
        </div>
        <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
          Provider failed to submit tracking within 24h — ₹{Number(req.amount).toLocaleString('en-IN')} was refunded to you
        </p>
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>{req.title}</span>
          {' · '}Re-publish to find a new provider or permanently delete this request.
        </p>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <motion.button
          onClick={() => onEdit(req)}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
          className="flex-1 sm:flex-initial btn-primary text-xs px-4 py-2 flex items-center justify-center gap-1.5">
          <RefreshCw size={12} /> Edit &amp; Re-publish
        </motion.button>
        <motion.button
          onClick={handleDelete}
          disabled={loading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
          className="flex-1 sm:flex-initial text-xs px-3.5 py-2 rounded-xl font-semibold transition justify-center flex items-center"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          Delete
        </motion.button>
      </div>
    </motion.div>
  );
}

function PayBanner({ tx, onPay, onDismiss }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 overflow-hidden"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.03) 50%,transparent 60%)', backgroundSize: '200% 100%', animation: 'shimmer 3s infinite' }} />

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center"
          style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
          <CreditCard size={18} />
        </motion.div>
        <div className="sm:hidden flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#f59e0b' }}>Action Required</p>
          <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--text)' }}>
            Complete your escrow payment
          </p>
        </div>
      </div>

      <div className="hidden sm:block flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
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
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
        className="w-full sm:w-auto shrink-0 btn-primary text-sm px-5 py-2.5 justify-center">
        <Zap size={14} /> Pay ₹{Number(tx.amount).toLocaleString('en-IN')}
      </motion.button>
    </motion.div>
  );
}

function TrackingBanner({ tx, onViewTracking }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 overflow-hidden"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center"
          style={{ background: 'var(--surface3)' }}>
          <Truck size={18} style={{ color: 'var(--text)' }} />
        </motion.div>
        <div className="sm:hidden flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#10b981' }}>Order Placed</p>
          <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--text)' }}>
            Shipped with tracking available
          </p>
        </div>
      </div>

      <div className="hidden sm:block flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#10b981' }}>Order Placed</p>
        </div>
        <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
          Your order has been shipped with tracking available
        </p>
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: '#10b981' }}>{tx.product_title}</span>
          {' · Tracking via '}<span className="capitalize">{tx.courier || 'Standard'}</span>
        </p>
      </div>

      <motion.button
        onClick={() => onViewTracking(tx)}
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
        className="w-full sm:w-auto shrink-0 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition justify-center flex items-center"
        style={{ background: 'var(--surface3)', border: '1px solid var(--border)' }}>
        <LinkIcon size={14} className="inline mr-1.5" /> View Tracking
      </motion.button>
    </motion.div>
  );
}

function UnmatchedExpireBanner({ req, onRepush, onRevoke }) {
  const [loading, setLoading] = useState(false);

  const handleRepushClick = async () => {
    setLoading(true);
    await onRepush(req);
    setLoading(false);
  };

  const handleRevokeClick = async () => {
    setLoading(true);
    await onRevoke(req);
    setLoading(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 overflow-hidden"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0 flex items-center justify-center"
          style={{ background: 'var(--surface3)' }}>
          <Clock size={18} style={{ color: 'var(--text)' }} />
        </motion.div>
        <div className="sm:hidden flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>Unmatched Expired</p>
          <p className="text-xs font-bold leading-tight truncate" style={{ color: 'var(--text)' }}>
            {req.title}
          </p>
        </div>
      </div>

      <div className="hidden sm:block flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>Unmatched Request Expired (48h)</p>
        </div>
        <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
          Request unmatched for 48 hours — Repush for 48h or Revoke to drop
        </p>
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>{req.title}</span>
          {' · '}₹{Number(req.amount).toLocaleString('en-IN')}
          {' · '}Category: {req.category || 'General'}
        </p>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <motion.button
          onClick={handleRepushClick}
          disabled={loading}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
          className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Repush 48h
        </motion.button>
        <motion.button
          onClick={handleRevokeClick}
          disabled={loading}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
          className="text-xs px-3.5 py-2 rounded-xl font-semibold transition"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          Revoke &amp; Drop
        </motion.button>
      </div>
    </motion.div>
  );
}

function RequestRow({ req, index, onViewDetails, onEdit }) {
  const color = CATEGORY_COLORS[req.category] || '#71717a';
  const meta  = STATUS_META[req.status] || { label: req.status, cls: 'badge-neutral', dot: '#6b7280' };
  return (
    <motion.div
      variants={item}
      className="flex items-center gap-4 px-5 py-4 group transition-all cursor-default"
      style={{ borderBottom: '1px solid var(--border2)' }}
      whileHover={{ background: 'var(--surface2)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      <div className="w-3 h-3 rounded-full shrink-0"
        style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />

      <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
        {req.category}
      </span>

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

      <p className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--text)' }}>
        ₹{Number(req.amount).toLocaleString('en-IN')}
      </p>

      <span className={`badge ${meta.cls} shrink-0`} style={{ gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
        {meta.label}
      </span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        {/* Strip edit option when request is matched with a provider or completed */}
        {(req.status === 'pending' || req.status === 'refunded' || req.status === 'cancelled') && (
          <motion.button
            onClick={() => onEdit(req)}
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            className="shrink-0 p-1.5 rounded-lg transition"
            style={{
              color: req.status === 'refunded' ? '#ef4444' : '#3b82f6',
              background: req.status === 'refunded' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'
            }}
            title={req.status === 'refunded' ? "Edit & Re-publish request" : "Edit request"}>
            {req.status === 'refunded' ? <RefreshCw size={13} /> : <Tag size={13} />}
          </motion.button>
        )}
        <motion.button
          onClick={() => onViewDetails(req)}
          whileHover={{ scale: 1.06, x: 2 }} whileTap={{ scale: 0.94 }}
          className="shrink-0 p-1.5 rounded-lg transition"
          style={{ color: 'var(--primary)', background: 'var(--primary-dim)' }}>
          <Eye size={13} />
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function BuyerDashboard({ requests = [], onPaymentAction, onRefresh, refreshKey = 0 }) {
  const { user } = useAuth();
  const [selectedReq, setSelectedReq] = useState(null);
  const [editingReq, setEditingReq] = useState(null);
  const [pendingTxs, setPendingTxs]   = useState([]);
  const [trackingTxs, setTrackingTxs] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchPendingTxs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getTransactions(user.id);
      setPendingTxs((res.data || []).filter(t => t.status === 'pending_payment' && t.buyer_id === user.id));
      setTrackingTxs((res.data || []).filter(t => t.status === 'tracking_submitted' && t.buyer_id === user.id));
      setLastUpdated(new Date());
    } catch { /* ignore */ }
  }, [user?.id]);

  useEffect(() => {
    fetchPendingTxs();
    pollRef.current = setInterval(fetchPendingTxs, 20_000);
    return () => clearInterval(pollRef.current);
  }, [fetchPendingTxs, refreshKey]);

  const handlePay = (tx) => { if (onPaymentAction) onPaymentAction(tx.id || tx._id, tx); };

  const handleViewTracking = (tx) => {
    const req = requests.find(r => (r.id || r._id) === (tx.request_id?.toString?.() || tx.request_id));
    if (req) setSelectedReq({ ...req, _tracking: tx });
  };

  const handleViewRequestDetails = (req) => {
    const trackingTx = trackingTxs.find(tx => (tx.request_id?.toString?.() || tx.request_id) === (req.id || req._id));
    if (trackingTx) {
      setSelectedReq({ ...req, _tracking: trackingTx });
    } else {
      setSelectedReq(req);
    }
  };

  const handleRequestUpdated = useCallback(async (updatedDoc) => {
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  const pending      = requests.filter(r => r.status === 'pending').length;
  const matched      = requests.filter(r => r.status === 'matched').length;
  const completed    = requests.filter(r => r.status === 'completed').length;
  const refunded     = requests.filter(r => r.status === 'refunded').length;
  const totalSpend   = requests.filter(r => r.status === 'completed').reduce((s, r) => s + Number(r.amount), 0);
  const totalSavings = Math.round(totalSpend * 0.12);

  const stats = [
    { label: 'Pending',      value: pending,                                    sub: 'awaiting match',       icon: Clock,        iconClass: 'stat-warning', delay: 0,    live: true },
    { label: 'Matched',      value: matched,                                    sub: 'provider assigned',    icon: ArrowUpRight, iconClass: 'stat-info',    delay: 0.07 },
    { label: 'Completed',    value: completed,                                  sub: 'successful deals',     icon: CheckCircle2, iconClass: 'stat-success', delay: 0.14 },
    { label: 'Est. Savings', value: `₹${totalSavings.toLocaleString('en-IN')}`,sub: 'via card discounts',   icon: TrendingDown, iconClass: 'stat-purple',  delay: 0.21 },
  ];

  const timeAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated) / 1000) < 60
      ? 'Just now'
      : `${Math.floor((Date.now() - lastUpdated) / 60000)}m ago`
    : '—';

  const handleRepushRequest = useCallback(async (req) => {
    try {
      await api.repushRequest(req.id || req._id);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('[Repush Error]', e);
    }
  }, [onRefresh]);

  const handleRevokeRequest = useCallback(async (req) => {
    try {
      await api.deleteRequest(req.id || req._id);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('[Revoke Error]', e);
    }
  }, [onRefresh]);

  const expiredRequests = requests.filter(r => {
    if (r.status !== 'pending') return false;
    const startTime = new Date(r.pushed_at || r.createdAt || r.updatedAt).getTime();
    if (isNaN(startTime)) return false;
    return (Date.now() - startTime) >= 48 * 60 * 60 * 1000;
  });

  const refundedRequests = requests.filter(r => r.status === 'refunded');

  return (
    <div className="space-y-7 max-w-5xl">
      {selectedReq && <RequestDetailsModal req={selectedReq} onClose={() => setSelectedReq(null)} onUpdated={handleRequestUpdated} />}
      {editingReq && (
        <EditRequestModal
          req={editingReq}
          onClose={() => setEditingReq(null)}
          onUpdated={(updatedDoc) => {
            setEditingReq(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}

      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
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

      {/* Refunded Requests Banner Area */}
      <AnimatePresence mode="popLayout">
        {refundedRequests.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {refundedRequests.map(req => (
              <RefundedBanner
                key={req.id || req._id}
                req={req}
                onEdit={setEditingReq}
                onDelete={handleRevokeRequest}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {expiredRequests.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {expiredRequests.map(req => (
              <UnmatchedExpireBanner
                key={req.id || req._id}
                req={req}
                onRepush={handleRepushRequest}
                onRevoke={handleRevokeRequest}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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

      <AnimatePresence mode="popLayout">
        {trackingTxs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#10b981' }}>
                {trackingTxs.length} Order{trackingTxs.length > 1 ? 's' : ''} Shipped
              </p>
            </div>
            {trackingTxs.map(tx => (
              <TrackingBanner key={tx.id || tx._id} tx={tx} onViewTracking={handleViewTracking} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={container} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className="card overflow-hidden lg:col-span-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        <div className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <ShoppingBag size={16} style={{ color: 'var(--text)' }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>My Requests</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {requests.length} total · {pending} pending
              </p>
            </div>
          </div>
        </div>

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
              <RequestRow key={req.id || req._id} req={req} index={i} onViewDetails={handleViewRequestDetails} onEdit={setEditingReq} />
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="lg:col-span-1">
        <NotificationFeed onPaymentAction={(txId) => onPaymentAction?.(txId, null)} />
      </motion.div>
      </div>

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
              const color = CATEGORY_COLORS[req.category] || '#71717a';
              const meta  = STATUS_META[req.status] || STATUS_META.pending;
              return (
                <motion.div key={req.id}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.44 + i * 0.06 }}
                  className="flex gap-4 relative">
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
