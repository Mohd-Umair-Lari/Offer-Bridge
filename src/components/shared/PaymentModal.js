"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Smartphone, Copy, Check, Loader2, AlertCircle, Package, Tag, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';

const ESCROW_UPI = process.env.NEXT_PUBLIC_ESCROW_UPI || 'offerbridge@upi'; // configure in .env.local

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border2)' }}>
      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'gradient-text' : ''}`}
        style={!highlight ? { color: 'var(--text)' } : {}}>
        {value}
      </span>
    </div>
  );
}

export default function PaymentModal({ tx, onClose, onSuccess }) {
  const [step, setStep]         = useState('summary');   // summary | upi | confirming | done
  const [upiRef, setUpiRef]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);

  if (!tx) return null;

  const feeAmt = Math.round(tx.amount * 0.02);
  const total  = tx.amount;  // buyer pays full; platform fee from provider's share
  const upiDeeplink = `upi://pay?pa=${ESCROW_UPI}&pn=OfferBridge+Escrow&am=${total}&cu=INR&tn=${encodeURIComponent('OfferBridge_' + (tx.id || tx._id))}`;

  const copyUPI = () => {
    navigator.clipboard.writeText(ESCROW_UPI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirm = async () => {
    if (!upiRef.trim()) { setError('Please enter the UPI transaction reference number.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.confirmPayment(tx.id || tx._id, upiRef.trim());
      setStep('done');
      setTimeout(() => { onSuccess?.(); onClose?.(); }, 2800);
    } catch (e) {
      setError(e.message || 'Payment confirmation failed. Please try again.');
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

          {/* ── Header ── */}
          <div className="px-6 py-5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 4px 16px var(--primary-glow)' }}>
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Secure Escrow Payment</p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Protected by OfferBridge Escrow</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">

            {/* Step: Summary */}
            {step === 'summary' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Product hero */}
                <div className="rounded-2xl p-5"
                  style={{ background: 'linear-gradient(135deg, #0d0d1e 0%, #1a0a2e 50%, #2d1060 100%)', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                      <Package size={18} style={{ color: '#a78bfa' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm leading-tight">{tx.product_title}</p>
                      {tx.category && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
                          <Tag size={9} /> {tx.category}
                        </span>
                      )}
                      {tx.product_link && (
                        <a href={tx.product_link} target="_blank" rel="noopener noreferrer"
                          className="block mt-1.5 text-[10px] truncate underline" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {tx.product_link}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(139,92,246,0.2)' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount to Pay</p>
                    <p className="text-3xl font-bold text-white tabular-nums mt-0.5">₹{total.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Held securely in escrow until order is confirmed
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border2)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Payment Breakdown</p>
                  </div>
                  <div className="px-4">
                    <InfoRow label="Product Amount" value={`₹${tx.amount.toLocaleString('en-IN')}`} />
                    <InfoRow label="Provider" value={tx.provider_name || '—'} />
                    <InfoRow label="Platform Fee" value={`₹${feeAmt.toLocaleString('en-IN')} (2%) — deducted from provider`} />
                    <InfoRow label="Total You Pay" value={`₹${total.toLocaleString('en-IN')}`} highlight />
                  </div>
                </div>

                {/* Escrow guarantee */}
                <div className="rounded-xl p-4 flex gap-3 items-start"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <ShieldCheck size={16} style={{ color: '#10b981' }} className="shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Your payment is held in escrow and <strong style={{ color: '#10b981' }}>100% refunded</strong> if the provider
                    fails to submit a tracking ID within <strong style={{ color: '#10b981' }}>24 hours</strong>. No cuts, no questions.
                  </p>
                </div>

                <motion.button id="payment-proceed-btn" onClick={() => setStep('upi')}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 6px 20px var(--primary-glow)' }}>
                  <Smartphone size={16} /> Proceed to Pay via UPI
                </motion.button>
              </motion.div>
            )}

            {/* Step: UPI */}
            {step === 'upi' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="text-center space-y-1">
                  <p className="font-bold" style={{ color: 'var(--text)' }}>Pay via UPI</p>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    Send <strong style={{ color: 'var(--primary)' }}>₹{total.toLocaleString('en-IN')}</strong> to the OfferBridge Escrow UPI ID
                  </p>
                </div>

                {/* UPI ID box */}
                <div className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Escrow UPI ID</p>
                    <p className="font-bold text-base" style={{ color: 'var(--primary)' }}>{ESCROW_UPI}</p>
                  </div>
                  <motion.button onClick={copyUPI} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg flex items-center gap-1.5 text-xs font-medium"
                    style={{ background: copied ? 'rgba(16,185,129,0.12)' : 'var(--surface3)', color: copied ? '#10b981' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {copied ? <><Check size={13} />Copied!</> : <><Copy size={13} />Copy</>}
                  </motion.button>
                </div>

                {/* Open in UPI app */}
                <motion.a href={upiDeeplink}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', display: 'flex' }}>
                  <Smartphone size={15} /> Open UPI App
                </motion.a>

                <div className="space-y-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    Enter UPI Reference Number
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    After paying, enter the UPI transaction ID / reference number from your payment app.
                  </p>
                  <input
                    id="upi-ref-input"
                    type="text"
                    placeholder="e.g. 412365891234"
                    value={upiRef}
                    onChange={e => { setUpiRef(e.target.value); setError(''); }}
                    className="input-dark"
                  />
                </div>

                {error && (
                  <div className="rounded-xl p-3 flex items-start gap-2"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={14} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
                    <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <motion.button onClick={() => setStep('summary')}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition"
                    style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    Back
                  </motion.button>
                  <motion.button id="payment-confirm-btn" onClick={handleConfirm} disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.97 }}
                    className="flex-[2] py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 4px 16px var(--primary-glow)' }}>
                    {loading ? <><Loader2 size={14} className="animate-spin" />Confirming…</> : <><ShieldCheck size={14} />Confirm Payment</>}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step: Done */}
            {step === 'done' && (
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
                  <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>Payment Confirmed!</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    ₹{total.toLocaleString('en-IN')} is now held in escrow. The provider has 24 hours to submit a tracking ID.
                  </p>
                </div>
                <div className="rounded-xl p-3"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-xs" style={{ color: '#10b981' }}>
                    You will receive a notification once the tracking ID is submitted. If not within 24h, your full payment will be automatically refunded.
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
