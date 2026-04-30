"use client";
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Star, TrendingUp, Clock, CheckCircle2, Truck, AlertCircle, ExternalLink } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const STATUS_STYLES = {
  pending:   'badge badge-warning',
  matched:   'badge badge-info',
  completed: 'badge badge-success',
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

// ── Tracking Action Banner ────────────────────────────────────────
function TrackingBanner({ tx, onSubmit }) {
  const hoursLeft = tx.tracking_due_at
    ? Math.max(0, Math.floor((new Date(tx.tracking_due_at) - new Date()) / 3_600_000))
    : null;
  const urgent = hoursLeft !== null && hoursLeft < 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: urgent
          ? 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(245,158,11,0.06) 100%)'
          : 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(59,130,246,0.06) 100%)',
        border: `1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
      }}>
      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{ background: urgent ? '#ef444420' : 'rgba(16,185,129,0.15)', border: `1px solid ${urgent ? '#ef444440' : 'rgba(16,185,129,0.3)'}` }}>
        <Truck size={18} style={{ color: urgent ? '#ef4444' : '#10b981' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          🚀 Payment secured — place the order &amp; submit tracking
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
          <strong>{tx.product_title}</strong> · ₹{Number(tx.amount).toLocaleString('en-IN')}
          {hoursLeft !== null && (
            <span className={`ml-2 font-bold ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
              · {hoursLeft}h remaining
            </span>
          )}
        </p>
        {tx.product_link && (
          <a href={tx.product_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-[10px] underline"
            style={{ color: 'var(--primary)' }}>
            <ExternalLink size={9} /> View product
          </a>
        )}
      </div>
      <motion.button
        id={`submit-tracking-${tx.id}`}
        onClick={() => onSubmit(tx)}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{
          background: urgent
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          boxShadow: urgent ? '0 4px 14px rgba(239,68,68,0.35)' : '0 4px 14px rgba(16,185,129,0.3)',
        }}>
        <Truck size={14} /> Submit Tracking
      </motion.button>
    </motion.div>
  );
}

export default function CardholderDashboard({ offers: offersProp, requests: reqsProp, onTrackingAction }) {
  const { user } = useAuth();
  const [trackingTxs, setTrackingTxs] = useState([]);

  const fetchTrackingTxs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getTransactions(user.id);
      const pending = (res.data || []).filter(t => t.status === 'tracking_pending');
      setTrackingTxs(pending);
    } catch { /* ignore */ }
  }, [user?.id]);

  useEffect(() => { fetchTrackingTxs(); }, [fetchTrackingTxs]);

  const handleSubmit = (tx) => {
    if (onTrackingAction) onTrackingAction(tx.id, tx);
  };

  const myOffers      = offersProp || [];
  const allReqs       = reqsProp   || [];
  const matchedReqs   = allReqs.filter(r => r.status === 'matched');
  const completedReqs = allReqs.filter(r => r.status === 'completed');
  const totalEarned   = completedReqs.reduce((sum, r) => sum + r.amount * 0.02, 0);
  const pendingEarned = matchedReqs.reduce((sum, r)  => sum + r.amount * 0.02, 0);

  const stats = [
    { label: 'Active Offers',    value: myOffers.length,                            sub: 'listed cards',         icon: Star,       iconClass: 'stat-warning', delay: 0 },
    { label: 'Matched Deals',    value: matchedReqs.length,                         sub: 'in progress',          icon: Clock,      iconClass: 'stat-info',    delay: 0.08 },
    { label: 'Total Earned',     value: `₹${totalEarned.toLocaleString('en-IN')}`,  sub: 'from completed deals', icon: DollarSign, iconClass: 'stat-success', delay: 0.16 },
    { label: 'Pending Earnings', value: `₹${pendingEarned.toLocaleString('en-IN')}`,sub: 'in active deals',      icon: TrendingUp, iconClass: 'stat-purple',  delay: 0.24 },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Cardholder Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Monetise your credit card offers by helping buyers</p>
      </motion.div>

      {/* ── Tracking Action Banners ── */}
      <AnimatePresence>
        {trackingTxs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} style={{ color: '#f59e0b' }} />
              <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                {trackingTxs.length} order{trackingTxs.length > 1 ? 's' : ''} awaiting tracking ID submission
              </p>
            </div>
            {trackingTxs.map(tx => (
              <TrackingBanner key={tx.id} tx={tx} onSubmit={handleSubmit} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Active Offers */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>My Active Offers</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Your listed cards visible to buyers</p>
        </div>
        <div>
          {myOffers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No offers listed yet.</p>
            </div>
          ) : myOffers.map((offer, i) => (
            <motion.div key={offer.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="px-5 py-4 flex items-center gap-4 transition"
              style={{ borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 4px 12px var(--primary-glow)' }}>
                {offer.bank?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{offer.card_name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{(offer.categories ?? []).join(' · ')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{offer.discount}% off</p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>+{offer.cashback}% cashback</p>
              </div>
              <span className="badge badge-success shrink-0 capitalize">{offer.status}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Recent Activity</h2>
        </div>
        <div>
          {allReqs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>No recent activity.</p>
            </div>
          ) : allReqs.slice(0, 4).map((req, i) => (
            <motion.div key={req.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
              className="px-5 py-3.5 flex items-center gap-4 transition"
              style={{ borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <CheckCircle2 size={16} style={{ color: req.status === 'completed' ? '#10b981' : 'var(--border)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{req.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{req.category}</p>
              </div>
              <p className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--text)' }}>₹{req.amount.toLocaleString('en-IN')}</p>
              <span className={STATUS_STYLES[req.status] || 'badge badge-neutral'}>{req.status}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
