"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Star, TrendingUp, Clock, CheckCircle2, Truck,
  AlertCircle, ExternalLink, CreditCard, Activity, RefreshCw,
  ShieldCheck, BarChart2, Zap, Banknote, ArrowUpRight, Package,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const STATUS_META = {
  pending:           { label: 'Pending',     cls: 'badge-warning', dot: '#f59e0b' },
  matched:           { label: 'Matched',     cls: 'badge-info',    dot: '#3b82f6' },
  completed:         { label: 'Completed',   cls: 'badge-success', dot: '#10b981' },
  tracking_pending:  { label: 'Ship Now!',   cls: 'badge-danger',  dot: '#ef4444' },
  tracking_submitted:{ label: 'Shipped',     cls: 'badge-cyan',    dot: '#06b6d4' },
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ── Tracking Action Banner ─────────────────────────────────────────
function TrackingBanner({ tx, onSubmit }) {
  const [hoursLeft, setHoursLeft] = useState(null);
  useEffect(() => {
    if (!tx.tracking_due_at) return;
    const update = () => setHoursLeft(Math.max(0, Math.floor((new Date(tx.tracking_due_at) - new Date()) / 3_600_000)));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [tx.tracking_due_at]);

  const urgent = hoursLeft !== null && hoursLeft < 6;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative rounded-2xl p-5 flex items-center gap-4 overflow-hidden"
      style={{
        background: urgent
          ? 'linear-gradient(135deg,rgba(239,68,68,0.12) 0%,rgba(245,158,11,0.06) 100%)'
          : 'linear-gradient(135deg,rgba(16,185,129,0.10) 0%,rgba(6,182,212,0.06) 100%)',
        border: `1px solid ${urgent ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
      }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.02) 50%,transparent 60%)', backgroundSize: '200% 100%', animation: 'shimmer 3s infinite' }} />

      <motion.div
        animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
        className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center"
        style={{
          background: urgent ? 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)' : 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
          boxShadow: urgent ? '0 6px 20px rgba(239,68,68,0.4)' : '0 6px 20px rgba(16,185,129,0.4)',
        }}>
        <Truck size={18} className="text-white" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {urgent ? <span className="live-dot-amber" /> : <span className="live-dot" />}
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: urgent ? '#ef4444' : '#10b981' }}>
            {urgent ? '⚠ Urgent — < 6h remaining' : 'Order Ready to Ship'}
          </p>
        </div>
        <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
          Payment secured — place the order &amp; submit a tracking ID
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{tx.product_title}</span>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>₹{Number(tx.amount).toLocaleString('en-IN')}</span>
          {hoursLeft !== null && (
            <span className="text-xs font-bold" style={{ color: urgent ? '#ef4444' : '#f59e0b' }}>
              {hoursLeft}h left
            </span>
          )}
          {tx.product_link && (
            <a href={tx.product_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs" style={{ color: '#06b6d4' }}>
              <ExternalLink size={10} /> View product
            </a>
          )}
        </div>
      </div>

      <motion.button
        id={`submit-tracking-${tx.id || tx._id}`}
        onClick={() => onSubmit(tx)}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{
          background: urgent ? 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)' : 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
          boxShadow: urgent ? '0 4px 16px rgba(239,68,68,0.4)' : '0 4px 16px rgba(16,185,129,0.35)',
        }}>
        <Truck size={14} /> Submit Tracking
      </motion.button>
    </motion.div>
  );
}

// ── Offer row ──────────────────────────────────────────────────────
function OfferRow({ offer, index }) {
  return (
    <motion.div
      variants={item}
      className="flex items-center gap-4 px-5 py-4 transition-all"
      style={{ borderBottom: '1px solid var(--border2)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      <div className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center text-white font-bold text-sm"
        style={{ background: 'linear-gradient(135deg,var(--primary) 0%,var(--primary-h) 100%)', boxShadow: '0 4px 14px var(--primary-glow)' }}>
        {offer.bank?.[0] ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{offer.card_name}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
          {offer.bank} · {(offer.categories ?? []).slice(0, 3).join(', ')}
        </p>
      </div>

      <div className="text-right shrink-0 space-y-0.5">
        <div className="flex items-center gap-2 justify-end">
          <span className="text-sm font-bold gradient-text">{offer.discount}% off</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            +{offer.cashback}% CB
          </span>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
          Up to ₹{Number(offer.max_amount || 0).toLocaleString('en-IN')}
        </p>
      </div>

      <span className="badge badge-success shrink-0">{offer.status || 'active'}</span>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function CardholderDashboard({ offers: offersProp, requests: reqsProp, onTrackingAction, refreshKey = 0 }) {
  const { user } = useAuth();
  const [trackingTxs, setTrackingTxs] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchTrackingTxs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getTransactions(user.id);
      setTrackingTxs((res.data || []).filter(t => (t.status === 'tracking_pending' || t.status === 'payment_received') && t.provider_id === user.id));
      setLastUpdated(new Date());
    } catch { /* ignore */ }
  }, [user?.id]);

  // Poll every 20s, and re-fetch when refreshKey changes
  useEffect(() => {
    fetchTrackingTxs();
    pollRef.current = setInterval(fetchTrackingTxs, 20_000);
    return () => clearInterval(pollRef.current);
  }, [fetchTrackingTxs, refreshKey]);

  const handleSubmit = (tx) => { if (onTrackingAction) onTrackingAction(tx.id || tx._id, tx); };

  const myOffers   = offersProp || [];
  const allReqs    = reqsProp   || [];
  const matched    = allReqs.filter(r => r.status === 'matched');
  const completed  = allReqs.filter(r => r.status === 'completed');
  const totalEarned   = completed.reduce((s, r) => s + Number(r.amount) * 0.02, 0);
  const pendingEarned = matched.reduce((s, r)   => s + Number(r.amount) * 0.02, 0);

  const stats = [
    { label: 'Active Cards',     value: myOffers.length,                              sub: 'listed in marketplace',  icon: CreditCard,   iconClass: 'stat-purple',  delay: 0,    live: true },
    { label: 'Matched Deals',    value: matched.length,                               sub: 'in progress',            icon: ArrowUpRight, iconClass: 'stat-info',    delay: 0.07 },
    { label: 'Total Earned',     value: `₹${Math.round(totalEarned).toLocaleString('en-IN')}`,  sub: 'from completed deals', icon: Banknote,     iconClass: 'stat-success', delay: 0.14 },
    { label: 'Pending Earnings', value: `₹${Math.round(pendingEarned).toLocaleString('en-IN')}`,sub: 'from active deals',    icon: TrendingUp,   iconClass: 'stat-warning', delay: 0.21 },
  ];

  const timeAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated) / 1000) < 60
      ? 'Just now'
      : `${Math.floor((Date.now() - lastUpdated) / 60000)}m ago`
    : '—';

  return (
    <div className="space-y-7 max-w-5xl">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#10b981' }}>Live</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Provider <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage your card offers &amp; deals · Updated {timeAgo}
          </p>
        </div>
        <motion.button onClick={fetchTrackingTxs}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition"
          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <RefreshCw size={13} /> Refresh
        </motion.button>
      </motion.div>

      {/* ── Tracking Action Banners ── */}
      <AnimatePresence mode="popLayout">
        {trackingTxs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} style={{ color: '#f59e0b' }} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#f59e0b' }}>
                {trackingTxs.length} Order{trackingTxs.length > 1 ? 's' : ''} Awaiting Tracking Submission
              </p>
            </div>
            {trackingTxs.map(tx => (
              <TrackingBanner key={tx.id || tx._id} tx={tx} onSubmit={handleSubmit} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats ── */}
      <motion.div variants={container} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* ── Active Offers ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(139,92,246,0.04) 0%,transparent 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <CreditCard size={16} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>My Active Cards</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {myOffers.length} cards · visible to buyers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>Live sync</span>
          </div>
        </div>

        {myOffers.length === 0 ? (
          <div className="py-20 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--primary-dim)' }}>
              <CreditCard size={28} style={{ color: 'var(--primary)' }} />
            </motion.div>
            <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>No cards listed yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Go to My Cards to list your credit/debit card and start earning</p>
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="visible">
            {myOffers.map((offer, i) => <OfferRow key={offer.id} offer={offer} index={i} />)}
          </motion.div>
        )}
      </motion.div>

      {/* ── Earnings Overview ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
        className="card overflow-hidden">
        <div className="px-6 py-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(16,185,129,0.04) 0%,transparent 100%)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <BarChart2 size={16} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: 'var(--text)' }}>Earnings Overview</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>2% commission per completed deal</p>
          </div>
        </div>

        <div className="p-6 grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Earned',    value: `₹${Math.round(totalEarned).toLocaleString('en-IN')}`,   sub: `${completed.length} deals`, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
            { label: 'Pending Payout',  value: `₹${Math.round(pendingEarned).toLocaleString('en-IN')}`, sub: `${matched.length} in progress`, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
            { label: 'Escrow Protected',value: `₹${Math.round(pendingEarned).toLocaleString('en-IN')}`, sub: 'Held safely in escrow', color: 'var(--primary)', bg: 'var(--primary-dim)', border: 'rgba(139,92,246,0.2)' },
          ].map(({ label, value, sub, color, bg, border }) => (
            <motion.div key={label} whileHover={{ y: -3 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Escrow info */}
        <div className="mx-6 mb-6 rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <ShieldCheck size={15} style={{ color: 'var(--primary)' }} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            OfferBridge holds funds in <strong style={{ color: 'var(--primary)' }}>escrow</strong> until you provide a tracking ID.
            You have <strong style={{ color: '#f59e0b' }}>24 hours</strong> per order — funds are auto-refunded if the deadline is missed.
          </p>
        </div>
      </motion.div>

      {/* ── Recent Deals ── */}
      {allReqs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
          className="card overflow-hidden">
          <div className="px-6 py-5 flex items-center gap-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(6,182,212,0.04) 0%,transparent 100%)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <Activity size={16} style={{ color: '#06b6d4' }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>Recent Deals</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Your latest matched requests</p>
            </div>
          </div>
          <motion.div variants={container} initial="hidden" animate="visible">
            {allReqs.slice(0, 5).map((req, i) => {
              const meta = STATUS_META[req.status] || STATUS_META.pending;
              return (
                <motion.div key={req.id} variants={item}
                  className="flex items-center gap-4 px-5 py-4 transition"
                  style={{ borderBottom: '1px solid var(--border2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <CheckCircle2 size={16} style={{ color: req.status === 'completed' ? '#10b981' : 'var(--border)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{req.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{req.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>₹{Number(req.amount).toLocaleString('en-IN')}</p>
                    <p className="text-[11px]" style={{ color: '#10b981' }}>
                      +₹{Math.round(Number(req.amount) * 0.02).toLocaleString('en-IN')} earned
                    </p>
                  </div>
                  <span className={`badge ${meta.cls} shrink-0`}>{meta.label}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
