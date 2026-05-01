"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, TrendingUp, CheckCircle2, Clock, CreditCard,
  ShoppingBag, Truck, Zap, AlertCircle, Activity, RefreshCw,
  ArrowUpRight, Banknote, Package, BarChart2, ShieldCheck,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const STATUS_META = {
  pending:          { label: 'Pending',   cls: 'badge-warning', dot: '#f59e0b' },
  matched:          { label: 'Matched',   cls: 'badge-info',    dot: '#3b82f6' },
  completed:        { label: 'Completed', cls: 'badge-success', dot: '#10b981' },
  pending_payment:  { label: 'Pay Now',   cls: 'badge-danger',  dot: '#ef4444' },
  tracking_pending: { label: 'Ship Now',  cls: 'badge-danger',  dot: '#ef4444' },
  tracking_submitted:{ label: 'Shipped', cls: 'badge-cyan',    dot: '#06b6d4' },
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ── Pay Now Banner ─────────────────────────────────────────────────
function PayBanner({ tx, onPay }) {
  return (
    <motion.div layout initial={{ opacity:0, y:-12, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, x:60, scale:0.9 }} transition={{ type:'spring', stiffness:300, damping:24 }}
      className="relative rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
      style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(6,182,212,0.06))', border:'1px solid rgba(139,92,246,0.3)' }}>
      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{ background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', boxShadow:'0 4px 14px rgba(139,92,246,0.4)' }}>
        <Zap size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase" style={{ color:'#f59e0b' }}>Payment Required</p>
        <p className="text-sm font-semibold truncate" style={{ color:'var(--text)' }}>{tx.product_title}</p>
        <p className="text-xs" style={{ color:'var(--text-dim)' }}>₹{Number(tx.amount).toLocaleString('en-IN')}</p>
      </div>
      <motion.button id={`pay-${tx.id||tx._id}`} onClick={() => onPay(tx)}
        whileHover={{ scale:1.04 }} whileTap={{ scale:0.95 }}
        className="btn-primary text-xs px-4 py-2 shrink-0">
        Pay Now
      </motion.button>
    </motion.div>
  );
}

// ── Tracking Banner ────────────────────────────────────────────────
function TrackingBanner({ tx, onSubmit }) {
  const [hrs, setHrs] = useState(null);
  useEffect(() => {
    if (!tx.tracking_due_at) return;
    const upd = () => setHrs(Math.max(0, Math.floor((new Date(tx.tracking_due_at) - new Date()) / 3_600_000)));
    upd();
    const id = setInterval(upd, 60_000);
    return () => clearInterval(id);
  }, [tx.tracking_due_at]);
  const urgent = hrs !== null && hrs < 6;
  return (
    <motion.div layout initial={{ opacity:0, y:-12, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }}
      exit={{ opacity:0, x:60, scale:0.9 }} transition={{ type:'spring', stiffness:300, damping:24 }}
      className="relative rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
      style={{
        background: urgent ? 'linear-gradient(135deg,rgba(239,68,68,0.10),rgba(245,158,11,0.06))' : 'linear-gradient(135deg,rgba(16,185,129,0.10),rgba(6,182,212,0.06))',
        border:`1px solid ${urgent ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
      }}>
      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{ background: urgent ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)', boxShadow: urgent ? '0 4px 14px rgba(239,68,68,0.4)' : '0 4px 14px rgba(16,185,129,0.4)' }}>
        <Truck size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase" style={{ color: urgent ? '#ef4444' : '#10b981' }}>
          {urgent ? `⚠ Only ${hrs}h left` : 'Ship the order'}
        </p>
        <p className="text-sm font-semibold truncate" style={{ color:'var(--text)' }}>{tx.product_title}</p>
        <p className="text-xs" style={{ color:'var(--text-dim)' }}>₹{Number(tx.amount).toLocaleString('en-IN')}</p>
      </div>
      <motion.button id={`track-${tx.id||tx._id}`} onClick={() => onSubmit(tx)}
        whileHover={{ scale:1.04 }} whileTap={{ scale:0.95 }}
        className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white"
        style={{ background: urgent ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)' }}>
        Submit Tracking
      </motion.button>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function ProsumerDashboard({ requests=[], offers:offersProp=[], onPaymentAction, onTrackingAction, refreshKey=0 }) {
  const { user } = useAuth();
  const [pendingTxs, setPendingTxs]   = useState([]);
  const [trackingTxs, setTrackingTxs] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const fetchTxs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getTransactions(user.id);
      const data = res.data || [];
      setPendingTxs(data.filter(t => t.status === 'pending_payment' && t.buyer_id === user.id));
      setTrackingTxs(data.filter(t => (t.status === 'tracking_pending' || t.status === 'payment_received') && t.provider_id === user.id));
      setLastUpdated(new Date());
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    fetchTxs();
    pollRef.current = setInterval(fetchTxs, 20_000);
    return () => clearInterval(pollRef.current);
  }, [fetchTxs, refreshKey]);

  const myOffers = offersProp;

  // Stats
  const pending   = requests.filter(r => r.status === 'pending').length;
  const matched   = requests.filter(r => r.status === 'matched').length;
  const completed = requests.filter(r => r.status === 'completed').length;
  const totalSaved  = requests.filter(r=>r.status==='completed').reduce((s,r)=>s+Number(r.amount)*0.12,0);
  const totalEarned = requests.filter(r=>r.status==='completed').reduce((s,r)=>s+Number(r.amount)*0.02,0);
  const pendingEarnings = requests.filter(r=>r.status==='matched').reduce((s,r)=>s+Number(r.amount)*0.02,0);

  const timeAgo = lastUpdated
    ? Math.floor((Date.now()-lastUpdated)/1000)<60 ? 'Just now' : `${Math.floor((Date.now()-lastUpdated)/60000)}m ago`
    : '—';

  const stats = [
    { label:'Pending Buys',    value: pending,                                         sub:'awaiting match',       icon:Clock,       iconClass:'stat-warning', delay:0,    live:true },
    { label:'Matched',         value: matched,                                          sub:'in progress',          icon:ArrowUpRight, iconClass:'stat-info',   delay:0.07 },
    { label:'Buyer Savings',   value:`₹${Math.round(totalSaved).toLocaleString('en-IN')}`,  sub:'12% est. discount', icon:TrendingDown, iconClass:'stat-success', delay:0.14 },
    { label:'Provider Earned', value:`₹${Math.round(totalEarned).toLocaleString('en-IN')}`, sub:'2% commission',    icon:Banknote,     iconClass:'stat-purple',  delay:0.21 },
  ];

  return (
    <div className="space-y-7 max-w-5xl">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:'#10b981' }}>Live</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color:'var(--text)' }}>
            Prosumer <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>
            Buyer + Provider · Updated {timeAgo}
          </p>
        </div>
        <motion.button onClick={fetchTxs} whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
          <RefreshCw size={13} /> Refresh
        </motion.button>
      </motion.div>

      {/* Action banners */}
      <AnimatePresence mode="popLayout">
        {(pendingTxs.length > 0 || trackingTxs.length > 0) && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="space-y-3">
            {pendingTxs.length > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={13} style={{ color:'#f59e0b' }} />
                <p className="text-xs font-bold uppercase" style={{ color:'#f59e0b' }}>
                  {pendingTxs.length} Payment{pendingTxs.length>1?'s':''} Pending
                </p>
              </div>
            )}
            {pendingTxs.map(tx => (
              <PayBanner key={tx.id||tx._id} tx={tx} onPay={t => onPaymentAction?.(t.id||t._id, t)} />
            ))}
            {trackingTxs.length > 0 && (
              <div className="flex items-center gap-2 mt-2 mb-1">
                <Truck size={13} style={{ color:'#10b981' }} />
                <p className="text-xs font-bold uppercase" style={{ color:'#10b981' }}>
                  {trackingTxs.length} Order{trackingTxs.length>1?'s':''} to Ship
                </p>
              </div>
            )}
            {trackingTxs.map(tx => (
              <TrackingBanner key={tx.id||tx._id} tx={tx} onSubmit={t => onTrackingAction?.(t.id||t._id, t)} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Split board */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Buyer side */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.28 }}
          className="card overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom:'1px solid var(--border)', background:'linear-gradient(135deg,rgba(59,130,246,0.04),transparent)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)' }}>
              <ShoppingBag size={14} style={{ color:'#3b82f6' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color:'var(--text)' }}>My Purchase Requests</h2>
              <p className="text-[11px]" style={{ color:'var(--text-dim)' }}>{requests.length} total · {pending} pending</p>
            </div>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background:'rgba(59,130,246,0.1)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.2)' }}>BUYER</span>
          </div>
          {requests.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={24} className="mx-auto mb-2" style={{ color:'var(--text-dim)' }} />
              <p className="text-xs" style={{ color:'var(--text-dim)' }}>No purchase requests yet</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="visible">
              {requests.slice(0,5).map((req,i) => {
                const meta = STATUS_META[req.status] || STATUS_META.pending;
                return (
                  <motion.div key={req.id} variants={item}
                    className="flex items-center gap-3 px-5 py-3.5 transition"
                    style={{ borderBottom:'1px solid var(--border2)' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background:meta.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color:'var(--text)' }}>{req.title}</p>
                      <p className="text-[11px]" style={{ color:'var(--text-dim)' }}>{req.category}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums shrink-0" style={{ color:'var(--text)' }}>
                      ₹{Number(req.amount).toLocaleString('en-IN')}
                    </p>
                    <span className={`badge ${meta.cls} shrink-0 text-[10px]`}>{meta.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Provider side */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.34 }}
          className="card overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3"
            style={{ borderBottom:'1px solid var(--border)', background:'linear-gradient(135deg,rgba(16,185,129,0.04),transparent)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)' }}>
              <CreditCard size={14} style={{ color:'#10b981' }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color:'var(--text)' }}>My Listed Cards</h2>
              <p className="text-[11px]" style={{ color:'var(--text-dim)' }}>{myOffers.length} card{myOffers.length!==1?'s':''} active</p>
            </div>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background:'rgba(16,185,129,0.1)', color:'#10b981', border:'1px solid rgba(16,185,129,0.2)' }}>PROVIDER</span>
          </div>
          {myOffers.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard size={24} className="mx-auto mb-2" style={{ color:'var(--text-dim)' }} />
              <p className="text-xs" style={{ color:'var(--text-dim)' }}>No cards listed yet — go to My Cards to add one</p>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="visible">
              {myOffers.map((offer,i) => (
                <motion.div key={offer.id||offer._id} variants={item}
                  className="flex items-center gap-3 px-5 py-3.5 transition"
                  style={{ borderBottom:'1px solid var(--border2)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm text-white"
                    style={{ background:'linear-gradient(135deg,var(--primary),var(--primary-h))', boxShadow:'0 3px 10px var(--primary-glow)' }}>
                    {offer.bank?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color:'var(--text)' }}>{offer.card_name}</p>
                    <p className="text-[11px]" style={{ color:'var(--text-dim)' }}>{offer.bank} · {offer.discount}% off</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold gradient-text">{offer.discount}%</p>
                    <p className="text-[10px]" style={{ color:'var(--text-dim)' }}>+{offer.cashback}% CB</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Earnings summary */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
        className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom:'1px solid var(--border)', background:'linear-gradient(135deg,rgba(139,92,246,0.04),transparent)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background:'var(--primary-dim)', border:'1px solid rgba(139,92,246,0.2)' }}>
            <BarChart2 size={14} style={{ color:'var(--primary)' }} />
          </div>
          <h2 className="font-bold text-sm" style={{ color:'var(--text)' }}>Combined Financials</h2>
        </div>
        <div className="p-5 grid sm:grid-cols-3 gap-4">
          {[
            { label:'Buyer Savings',     value:`₹${Math.round(totalSaved).toLocaleString('en-IN')}`,   sub:`${completed} completed`, color:'#3b82f6', bg:'rgba(59,130,246,0.06)',  border:'rgba(59,130,246,0.15)' },
            { label:'Provider Earned',   value:`₹${Math.round(totalEarned).toLocaleString('en-IN')}`,  sub:'2% commission',         color:'#10b981', bg:'rgba(16,185,129,0.06)', border:'rgba(16,185,129,0.15)' },
            { label:'Pending Earnings',  value:`₹${Math.round(pendingEarnings).toLocaleString('en-IN')}`, sub:`${matched} active deals`, color:'var(--primary)', bg:'var(--primary-dim)', border:'rgba(139,92,246,0.15)' },
          ].map(({ label, value, sub, color, bg, border }) => (
            <motion.div key={label} whileHover={{ y:-3 }}
              className="rounded-2xl p-4 text-center"
              style={{ background:bg, border:`1px solid ${border}` }}>
              <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
              <p className="text-xs font-semibold mt-1" style={{ color:'var(--text-muted)' }}>{label}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'var(--text-dim)' }}>{sub}</p>
            </motion.div>
          ))}
        </div>
        <div className="mx-5 mb-5 rounded-xl p-3 flex items-start gap-2.5"
          style={{ background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.12)' }}>
          <ShieldCheck size={13} style={{ color:'var(--primary)' }} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color:'var(--text-muted)' }}>
            As a prosumer, you can <strong style={{ color:'var(--primary)' }}>buy with card discounts</strong> and
            <strong style={{ color:'#10b981' }}> earn 2% commission</strong> as a provider — all from one account.
            Use the sidebar to access My Cards, Browse Requests, and New Request.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
