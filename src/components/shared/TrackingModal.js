"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Package, AlertCircle, Check, Loader2, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

const COURIERS = ['Amazon', 'Flipkart', 'Delhivery', 'BlueDart', 'DTDC', 'FedEx', 'Ekart', 'Other'];

function CountdownTimer({ dueAt }) {
  const [, forceUpdate] = useState(0);
  // Trigger rerender every minute
  useState(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 60_000);
    return () => clearInterval(id);
  });

  if (!dueAt) return null;
  const diff = new Date(dueAt) - new Date();
  if (diff <= 0) return <span style={{ color: '#ef4444' }}>Deadline passed</span>;

  const hours   = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const urgent  = hours < 4;

  return (
    <span style={{ color: urgent ? '#ef4444' : '#f59e0b' }} className="font-bold tabular-nums">
      {hours}h {minutes}m remaining
    </span>
  );
}

export default function TrackingModal({ tx, onClose, onSuccess }) {
  const [trackingId, setTrackingId] = useState('');
  const [courier, setCourier]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [done, setDone]             = useState(false);

  if (!tx) return null;

  const handleSubmit = async () => {
    if (!trackingId.trim()) { setError('Please enter a tracking ID.'); return; }
    if (!courier)           { setError('Please select a courier service.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.submitTracking(tx.id || tx._id, trackingId.trim(), courier);
      setDone(true);
      setTimeout(() => { onSuccess?.(); onClose?.(); }, 2600);
    } catch (e) {
      setError(e.message || 'Failed to submit tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
          onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(59,130,246,0.06) 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                <Truck size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Submit Tracking ID</p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Place order & release escrow</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">

            {!done ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Order summary */}
                <div className="rounded-2xl p-4"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Package size={16} style={{ color: '#10b981' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{tx.product_title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Buyer: {tx.buyer_name}</p>
                      {tx.product_link && (
                        <a href={tx.product_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[10px] underline" style={{ color: 'var(--primary)' }}>
                          <ExternalLink size={10} /> View Product
                        </a>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm gradient-text">₹{tx.amount?.toLocaleString('en-IN')}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>in escrow</p>
                    </div>
                  </div>
                </div>

                {/* Deadline warning */}
                {tx.tracking_due_at && (
                  <div className="rounded-xl p-3 flex items-start gap-2.5"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <Clock size={14} style={{ color: '#f59e0b' }} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Submit within deadline</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <CountdownTimer dueAt={tx.tracking_due_at} /> — otherwise the payment is automatically refunded to the buyer.
                      </p>
                    </div>
                  </div>
                )}

                {/* Courier select */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Courier / Platform</label>
                  <div className="grid grid-cols-4 gap-2">
                    {COURIERS.map(c => (
                      <button key={c} onClick={() => { setCourier(c); setError(''); }}
                        className="py-2 px-1 rounded-xl text-[11px] font-medium text-center transition"
                        style={courier === c
                          ? { background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', color: 'white' }
                          : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tracking ID input */}
                <div className="space-y-2">
                  <label htmlFor="tracking-id-input" className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    Tracking ID / Order Number
                  </label>
                  <input
                    id="tracking-id-input"
                    type="text"
                    placeholder="e.g. AMZ123456789IN or ORDER-987654"
                    value={trackingId}
                    onChange={e => { setTrackingId(e.target.value); setError(''); }}
                    className="input-dark"
                  />
                </div>

                {/* Escrow release note */}
                <div className="rounded-xl p-3 flex items-start gap-2"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--primary)' }} className="shrink-0 mt-0.5" />
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Submitting a tracking ID will release <strong style={{ color: 'var(--primary)' }}>
                      ₹{((tx.amount || 0) - Math.round((tx.amount || 0) * 0.02)).toLocaleString('en-IN')}
                    </strong> from escrow to you (after 2% platform fee).
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl p-3 flex items-start gap-2"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={14} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
                    <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                <motion.button id="submit-tracking-btn" onClick={handleSubmit} disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.97 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 6px 20px rgba(16,185,129,0.3)' }}>
                  {loading ? <><Loader2 size={14} className="animate-spin" />Submitting…</> : <><Truck size={14} />Submit Tracking ID</>}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
                  <Check size={32} className="text-white" />
                </motion.div>
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>Tracking Submitted!</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    The buyer has been notified and escrow payment is being released to your account.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
