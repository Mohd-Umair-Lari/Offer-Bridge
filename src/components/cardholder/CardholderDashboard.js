"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Star, TrendingUp, Clock, CheckCircle2, Truck,
  AlertCircle, ExternalLink, CreditCard, Activity, RefreshCw,
  ShieldCheck, BarChart2, Zap, Banknote, ArrowUpRight, Package, X,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import NotificationFeed from '@/components/shared/NotificationFeed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const STATUS_META = {
  pending:           { label: 'Pending',     cls: 'badge-warning', dot: '#f59e0b' },
  matched:           { label: 'Matched',     cls: 'badge-info',    dot: '#3b82f6' },
  completed:         { label: 'Completed',   cls: 'badge-success', dot: '#10b981' },
  tracking_pending:  { label: 'Ship Now!',   cls: 'badge-danger',  dot: '#ef4444' },
  tracking_submitted:{ label: 'Shipped',     cls: 'badge-cyan',    dot: '#06b6d4' },
  refunded:          { label: 'Refunded',    cls: 'badge-danger',  dot: '#ef4444' },
  cancelled:         { label: 'Cancelled',   cls: 'badge-neutral', dot: '#6b7280' },
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

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

function OfferRow({ offer, index }) {
  return (
    <motion.div
      variants={item}
      className="flex items-center gap-4 px-5 py-4 transition-all"
      style={{ borderBottom: '1px solid var(--border2)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      <div className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center font-bold text-sm"
        style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
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

function ProposedOfferRow({ tx, onWithdraw }) {
  const [confirming, setConfirming] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setWithdrawing(true);
    try {
      await onWithdraw(tx);
    } finally {
      setWithdrawing(false);
      setConfirming(false);
    }
  };

  return (
    <motion.div
      variants={item}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 transition-all"
      style={{ borderBottom: '1px solid var(--border2)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center font-bold text-sm"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Clock size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{tx.product_title}</p>
            <span className="badge badge-warning text-[10px] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block mr-1" />
              Awaiting Buyer Payment
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            <span>Buyer: <strong style={{ color: 'var(--text)' }}>{tx.buyer_name || 'Buyer'}</strong></span>
            {tx.category && <span>· {tx.category}</span>}
            {tx.createdAt && (
              <span>· Sent {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0"
        style={{ borderTop: '1px solid var(--border2)', borderColor: 'var(--border2)' }}>
        <div className="text-left sm:text-right">
          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>
            ₹{Number(tx.amount).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-semibold" style={{ color: '#10b981' }}>
            +₹{Number(tx.provider_earning || 0).toLocaleString('en-IN')} earning
          </p>
        </div>

        <div className="flex items-center gap-2">
          {confirming ? (
            <div className="flex items-center gap-1.5">
              <motion.button
                onClick={handleWithdraw}
                disabled={withdrawing}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-1"
                style={{ background: '#ef4444' }}>
                {withdrawing ? 'Withdrawing…' : 'Confirm Withdraw'}
              </motion.button>
              <button
                onClick={() => setConfirming(false)}
                disabled={withdrawing}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
                style={{ background: 'var(--surface3)', color: 'var(--text-dim)' }}>
                Cancel
              </button>
            </div>
          ) : (
            <motion.button
              onClick={() => setConfirming(true)}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
              title="Withdraw this proposal before the buyer completes payment">
              <X size={13} /> Withdraw Offer
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CardholderDashboard({ offers: offersProp, transactions: txsProp = [], requests: allReqs = [], onTrackingAction, onRefresh, refreshKey = 0 }) {
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

  useEffect(() => {
    fetchTrackingTxs();
    pollRef.current = setInterval(fetchTrackingTxs, 20_000);
    return () => clearInterval(pollRef.current);
  }, [fetchTrackingTxs, refreshKey]);

  const handleSubmit = (tx) => { if (onTrackingAction) onTrackingAction(tx.id || tx._id, tx); };

  const handleWithdrawProposal = async (tx) => {
    try {
      await api.withdrawProposal(tx.id || tx._id);
      fetchTrackingTxs();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('[Withdraw proposal error]', e);
    }
  };

  const myOffers    = offersProp || [];
  const allTxs      = txsProp || [];
  
  const proposedOffers = allTxs.filter(t => t.status === 'pending_payment' && t.provider_id === user?.id);
  const activeDeals    = allTxs.filter(t => (t.status === 'tracking_pending' || t.status === 'tracking_submitted') && t.provider_id === user?.id);
  const matchedTxs     = [...proposedOffers, ...activeDeals];
  const completedTxs   = allTxs.filter(t => t.status === 'completed' && t.provider_id === user?.id);
  const totalEarned    = completedTxs.reduce((s, t) => s + Number(t.provider_earning || 0), 0);
  const pendingEarned  = matchedTxs.reduce((s, t) => s + Number(t.provider_earning || 0), 0);

  const stats = [
    { label: 'Active Cards',     value: myOffers.length,                              sub: 'listed in marketplace',  icon: CreditCard,   iconClass: 'stat-purple',  delay: 0,    live: true },
    { label: 'Proposed Offers',  value: proposedOffers.length,                        sub: 'awaiting buyer pay',     icon: Clock,        iconClass: 'stat-warning', delay: 0.07 },
    { label: 'Total Earned',     value: `₹${Math.round(totalEarned).toLocaleString('en-IN')}`,  sub: 'from completed deals', icon: Banknote,     iconClass: 'stat-success', delay: 0.14 },
    { label: 'Pending Earnings', value: `₹${Math.round(pendingEarned).toLocaleString('en-IN')}`,sub: 'active + proposed',   icon: TrendingUp,   iconClass: 'stat-info',    delay: 0.21 },
  ];

  const timeAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated) / 1000) < 60
      ? 'Just now'
      : `${Math.floor((Date.now() - lastUpdated) / 60000)}m ago`
    : '—';

  return (
    <div className="space-y-7 max-w-5xl">

      <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Provider <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage your card offers &amp; deals · Updated {timeAgo}
          </p>
        </div>
        <motion.button onClick={() => { fetchTrackingTxs(); if (onRefresh) onRefresh(); }}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition"
          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <RefreshCw size={13} /> Refresh
        </motion.button>
      </motion.div>

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

      <motion.div variants={container} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* ── PROPOSED OFFERS (Awaiting Buyer Payment) ─────────────────────── */}
      <AnimatePresence mode="popLayout">
        {proposedOffers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="card overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="px-6 py-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(245,158,11,0.06) 0%,transparent 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Clock size={16} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <h2 className="font-bold" style={{ color: 'var(--text)' }}>Proposed Offers</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {proposedOffers.length} offer{proposedOffers.length > 1 ? 's' : ''} awaiting buyer checkout · withdrawable anytime before payment
                  </p>
                </div>
              </div>
            </div>

            <motion.div variants={container} initial="hidden" animate="visible">
              {proposedOffers.map(tx => (
                <ProposedOfferRow
                  key={tx.id || tx._id}
                  tx={tx}
                  onWithdraw={handleWithdrawProposal}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="card overflow-hidden lg:col-span-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <CreditCard size={16} style={{ color: 'var(--text)' }} />
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text)' }}>My Active Cards</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {myOffers.length} cards · visible to buyers
              </p>
            </div>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-1">
        <NotificationFeed onTrackingAction={(txId) => onTrackingAction?.(txId, null)} />
      </motion.div>
      </div>

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
            { label: 'Total Earned',    value: `₹${Math.round(totalEarned).toLocaleString('en-IN')}`,   sub: `${completedTxs.length} deals completed`, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
            { label: 'Pending Payout',  value: `₹${Math.round(pendingEarned).toLocaleString('en-IN')}`, sub: `${matchedTxs.length} in progress`, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
            { label: 'Escrow Protected',value: `₹${Math.round(pendingEarned).toLocaleString('en-IN')}`, sub: 'Dynamic 50/35/15 split', color: 'var(--text)', bg: 'var(--surface2)', border: 'var(--border)' },
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

        <div className="mx-6 mb-6 rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <ShieldCheck size={15} style={{ color: 'var(--primary)' }} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--primary)' }}>Dynamic Earnings Model:</strong> You earn <strong>35%</strong> of the card discount per deal.
            Customers save <strong>50%</strong>, we keep <strong>15%</strong> platform fee.
            Funds held in <strong style={{ color: 'var(--primary)' }}>escrow</strong> until you provide a tracking ID within <strong style={{ color: '#f59e0b' }}>24 hours</strong>.
          </p>
        </div>
      </motion.div>

      {allTxs.length > 0 && (
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
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Your latest matched transactions</p>
            </div>
          </div>
          <motion.div variants={container} initial="hidden" animate="visible">
            {allTxs.slice(0, 5).map((tx, i) => {
              const statusMap = {
                'pending_payment': { label: 'Awaiting Payment', cls: 'badge-warning', color: '#f59e0b' },
                'payment_received': { label: 'Payment Received', cls: 'badge-info', color: '#3b82f6' },
                'tracking_pending': { label: 'Ship Now!', cls: 'badge-danger', color: '#ef4444' },
                'tracking_submitted': { label: 'Shipped', cls: 'badge-cyan', color: '#06b6d4' },
                'completed': { label: 'Completed', cls: 'badge-success', color: '#10b981' },
                'refunded': { label: 'Refunded', cls: 'badge-danger', color: '#ef4444' },
                'cancelled': { label: 'Cancelled', cls: 'badge-neutral', color: '#6b7280' },
              };
              const meta = statusMap[tx.status] || { label: tx.status, cls: 'badge-muted', color: '#6b7280' };
              const isCompleted = tx.status === 'completed';
              return (
                <motion.div key={tx.id || tx._id} variants={item}
                  className="flex items-center gap-4 px-5 py-4 transition"
                  style={{ borderBottom: '1px solid var(--border2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <CheckCircle2 size={16} style={{ color: isCompleted ? '#10b981' : 'var(--border)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{tx.product_title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>from {tx.buyer_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text)' }}>₹{Number(tx.amount).toLocaleString('en-IN')}</p>
                    <p className="text-[11px]" style={{ color: '#10b981' }}>
                      +₹{Number(tx.provider_earning || 0).toLocaleString('en-IN')} earning
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
