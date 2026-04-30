"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShieldCheck, Smartphone, Copy, Check,
  Loader2, Package, Tag, ExternalLink, Zap,
} from 'lucide-react';
import { api } from '@/lib/api';

const ESCROW_UPI = process.env.NEXT_PUBLIC_ESCROW_UPI || 'offerbridge@upi';

// ── steps: summary → simulating → done
export default function PaymentModal({ tx, onClose, onSuccess }) {
  const [step, setStep]       = useState('summary');  // summary | simulating | done
  const [copied, setCopied]   = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError]     = useState('');

  // Auto-countdown while simulating
  useEffect(() => {
    if (step !== 'simulating') return;
    if (countdown === 0) {
      confirmPayment();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tx) return null;

  const total   = Number(tx.amount);
  const feeAmt  = Math.round(total * 0.02);
  const upiDeep = `upi://pay?pa=${ESCROW_UPI}&pn=OfferBridge+Escrow&am=${total}&cu=INR&tn=OfferBridge_${tx.id || tx._id}`;

  const copyUPI = () => {
    navigator.clipboard.writeText(ESCROW_UPI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const startSimulation = () => {
    setCountdown(3);
    setStep('simulating');
  };

  const confirmPayment = async () => {
    const fakeRef = `SIM${Date.now()}`;
    try {
      await api.confirmPayment(tx.id || tx._id, fakeRef);
      setStep('done');
      setTimeout(() => { onSuccess?.(); onClose?.(); }, 2200);
    } catch (e) {
      setError(e.message || 'Confirmation failed. Please try again.');
      setStep('summary');
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4">

        {/* Backdrop */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
          onClick={step === 'simulating' ? undefined : onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>

          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(59,130,246,0.08) 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,var(--primary) 0%,var(--primary-h) 100%)', boxShadow: '0 4px 16px var(--primary-glow)' }}>
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Secure Escrow Payment</p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Protected by OfferBridge Escrow</p>
              </div>
            </div>
            {step !== 'simulating' && (
              <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X size={18} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[78vh]">

            {/* ── STEP: summary ── */}
            {step === 'summary' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

                {/* Product hero */}
                <div className="rounded-2xl p-5"
                  style={{ background: 'linear-gradient(135deg,#0d0d1e 0%,#1a0a2e 50%,#2d1060 100%)', border: '1px solid rgba(139,92,246,0.25)' }}>
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
                          className="flex items-center gap-1 mt-1.5 text-[10px] underline" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <ExternalLink size={9} /> View product
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(139,92,246,0.2)' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount to Pay</p>
                    <p className="text-3xl font-bold text-white tabular-nums mt-0.5">₹{total.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Held in escrow until order is confirmed</p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="px-4 py-2.5" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border2)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Payment Breakdown</p>
                  </div>
                  {[
                    ['Product Amount', `₹${total.toLocaleString('en-IN')}`],
                    ['Provider', tx.provider_name || '—'],
                    ['Platform Fee', `₹${feeAmt.toLocaleString('en-IN')} (2%) — from provider's share`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: '1px solid var(--border2)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>You Pay</span>
                    <span className="text-sm font-bold gradient-text">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* UPI ID display */}
                <div className="rounded-xl p-4 flex items-center justify-between gap-3"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Escrow UPI ID</p>
                    <p className="font-bold text-base" style={{ color: 'var(--primary)' }}>{ESCROW_UPI}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button onClick={copyUPI} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg flex items-center gap-1.5 text-xs font-medium"
                      style={{ background: copied ? 'rgba(16,185,129,0.12)' : 'var(--surface3)', color: copied ? '#10b981' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                      {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
                    </motion.button>
                    <motion.a href={upiDeep} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg flex items-center gap-1.5 text-xs font-medium"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                      <Smartphone size={12} /> Open App
                    </motion.a>
                  </div>
                </div>

                {/* Escrow guarantee */}
                <div className="rounded-xl p-4 flex gap-3 items-start"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <ShieldCheck size={15} style={{ color: '#10b981' }} className="shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Your payment is held in escrow and <strong style={{ color: '#10b981' }}>100% refunded</strong> if the
                    provider fails to submit a tracking ID within <strong style={{ color: '#10b981' }}>24 hours</strong>.
                  </p>
                </div>

                {error && (
                  <p className="text-xs rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                    {error}
                  </p>
                )}

                {/* CTA: simulates tapping "Pay" in a UPI app */}
                <motion.button id="payment-proceed-btn" onClick={startSimulation}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,var(--primary) 0%,var(--primary-h) 100%)', boxShadow: '0 6px 20px var(--primary-glow)' }}>
                  <Zap size={16} /> Pay ₹{total.toLocaleString('en-IN')} via UPI
                </motion.button>

                <p className="text-[10px] text-center" style={{ color: 'var(--text-dim)' }}>
                  Payment is simulated (demo mode) — no real money is transferred
                </p>
              </motion.div>
            )}

            {/* ── STEP: simulating UPI redirect ── */}
            {step === 'simulating' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center gap-6 text-center">

                {/* Animated UPI logo placeholder */}
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-20 h-20 rounded-full border-4 border-transparent"
                    style={{ borderTopColor: 'var(--primary)', borderRightColor: 'rgba(139,92,246,0.3)' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Smartphone size={28} style={{ color: 'var(--primary)' }} />
                  </div>
                </div>

                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>Redirecting to UPI…</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Processing payment of <strong style={{ color: 'var(--primary)' }}>₹{total.toLocaleString('en-IN')}</strong>
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
                    Confirming in <strong style={{ color: '#f59e0b' }}>{countdown}s</strong>…
                  </p>
                </div>

                <div className="w-full rounded-xl p-3"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Paying to <strong style={{ color: 'var(--primary)' }}>{ESCROW_UPI}</strong> · Secured in escrow
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── STEP: done ── */}
            {step === 'done' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-5">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)', boxShadow: '0 0 50px rgba(16,185,129,0.5)' }}>
                  <Check size={36} className="text-white" />
                </motion.div>
                <div>
                  <p className="font-bold text-xl" style={{ color: 'var(--text)' }}>Payment Confirmed!</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    ₹{total.toLocaleString('en-IN')} is now secured in escrow.
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-xs" style={{ color: '#10b981' }}>
                    The provider has been notified and has 24 hours to submit a tracking ID.
                    If they miss the deadline, your payment is fully refunded — no cuts.
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

