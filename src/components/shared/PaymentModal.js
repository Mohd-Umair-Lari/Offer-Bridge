"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShieldCheck, Package, Tag, ExternalLink,
  Loader2, AlertCircle, Check, Clock, IndianRupee,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Razorpay SDK loader (loads once, cached on window) ──────────────────────
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending_payment:    { label: 'Awaiting Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    tracking_pending:   { label: 'Payment Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    tracking_submitted: { label: 'Order Placed',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    completed:          { label: 'Completed',          color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    refunded:           { label: 'Refunded',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  };
  const s = map[status] || { label: status, color: 'var(--text-dim)', bg: 'var(--surface2)' };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaymentModal({ tx: initialTx, onClose, onSuccess }) {
  const [tx, setTx]           = useState(initialTx);
  const [step, setStep]       = useState('summary');   // summary | paying | done | error
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const rzpRef                = useRef(null);

  useEffect(() => { return () => rzpRef.current?.close(); }, []);

  if (!tx) return null;

  const total       = Number(tx.amount);
  const paise       = Math.round(total * 100);
  const savings     = Number(tx.customer_savings || 0);
  const feeAmt      = Number(tx.platform_commission || Math.round(total * 0.02));
  const alreadyPaid = ['tracking_pending', 'tracking_submitted', 'completed'].includes(tx.status);

  // ── Launch Razorpay checkout ───────────────────────────────────────────────
  async function handlePay() {
    setError('');
    setLoading(true);
    try {
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) throw new Error('Could not load payment gateway. Please check your connection.');

      // 1. Create / fetch the Razorpay order on our server
      const res = await api.createCheckoutOrder(tx.id || tx._id);
      const { keyId, orderId, amount: amt, currency } = res.data;

      if (!keyId || !orderId) throw new Error('Payment configuration missing. Please contact support.');

      setStep('paying');
      setLoading(false);

      // 2. Open Razorpay checkout
      const options = {
        key:         keyId,
        amount:      amt,
        currency:    currency || 'INR',
        name:        'OfferBridges',
        description: tx.product_title || 'Purchase',
        order_id:    orderId,
        prefill: {
          name:  tx.buyer_name  || '',
          email: '',
          contact: '',
        },
        theme: { color: '#ffffff', backdrop_color: 'rgba(0,0,0,0.85)' },
        modal: {
          backdropclose: false,
          escape: false,
          ondismiss: () => {
            setStep('summary');
          },
        },
        handler: async (response) => {
          // 3. Verify on our server
          try {
            await api.verifyCheckoutPayment(tx.id || tx._id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            });
            setStep('done');
            setTimeout(() => { onSuccess?.(); onClose?.(); }, 2500);
          } catch (e) {
            setError(e.message || 'Payment verification failed. Please contact support with your payment ID.');
            setStep('error');
          }
        },
      };

      rzpRef.current = new window.Razorpay(options);
      rzpRef.current.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed. Please try again.');
        setStep('error');
      });
      rzpRef.current.open();

    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
      setStep('error');
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}
          onClick={step === 'paying' ? undefined : onClose}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
                <ShieldCheck size={17} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Secure Escrow Payment</p>
                <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Protected by OfferBridges · Razorpay</p>
              </div>
            </div>
            {step !== 'paying' && (
              <button onClick={onClose} className="p-1.5 rounded-lg transition"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X size={17} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto max-h-[80vh] space-y-4">

            {/* ── SUMMARY ───────────────────────────────────────────────── */}
            {(step === 'summary' || step === 'paying') && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                {/* Status */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={tx.status} />
                  {tx.razorpay_payment_id && (
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
                      ID: {tx.razorpay_payment_id.slice(-8)}
                    </span>
                  )}
                </div>

                {/* Product card */}
                <div className="rounded-xl p-4"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ background: 'var(--surface3)', border: '1px solid var(--border)' }}>
                      <Package size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text)' }}>
                        {tx.product_title || 'Purchase'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {tx.category && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--surface3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            <Tag size={8} />{tx.category}
                          </span>
                        )}
                        {tx.product_link && (
                          <a href={tx.product_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px]"
                            style={{ color: 'var(--primary)' }}>
                            <ExternalLink size={9} /> View product
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-baseline gap-1">
                      <IndianRupee size={18} style={{ color: 'var(--text)', strokeWidth: 2 }} />
                      <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                        {total.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      Held in escrow — released to provider after order confirmation
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <div className="px-4 py-2.5" style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text)' }}>Breakdown</p>
                  </div>
                  {[
                    ['You Pay',             `₹${total.toLocaleString('en-IN')}`,   'var(--text)'],
                    ['Your Savings (card benefit)', savings > 0 ? `−₹${savings.toLocaleString('en-IN')}` : '—', '#10b981'],
                    ['Platform Fee (from provider)', `₹${feeAmt.toLocaleString('en-IN')} (2%)`, 'var(--text-dim)'],
                    ['Provider',            tx.provider_name || '—',                'var(--text-dim)'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: '1px solid var(--border2)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{label}</span>
                      <span className="text-xs font-semibold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Escrow guarantee */}
                <div className="rounded-xl p-3.5 flex gap-2.5 items-start"
                  style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <ShieldCheck size={14} style={{ color: '#10b981' }} className="shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Funds are held securely in escrow.{' '}
                    <strong style={{ color: '#10b981' }}>100% auto-refunded</strong> if the
                    provider doesn't submit a tracking ID within <strong style={{ color: '#10b981' }}>24 hours</strong>.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-xl px-4 py-3 flex gap-2.5 items-start"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={14} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
                    <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                {/* CTA */}
                {!alreadyPaid ? (
                  <motion.button
                    id="razorpay-pay-btn"
                    onClick={handlePay}
                    disabled={loading || step === 'paying'}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: 'var(--primary)', color: 'var(--bg)' }}
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Preparing checkout…</>
                    ) : step === 'paying' ? (
                      <><Loader2 size={16} className="animate-spin" /> Razorpay checkout open…</>
                    ) : (
                      <>Pay ₹{total.toLocaleString('en-IN')} via Razorpay</>
                    )}
                  </motion.button>
                ) : (
                  <div className="rounded-xl py-3 flex items-center justify-center gap-2"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <Check size={15} style={{ color: '#10b981' }} />
                    <span className="text-sm font-semibold" style={{ color: '#10b981' }}>Payment already received</span>
                  </div>
                )}

                <p className="text-[10px] text-center" style={{ color: 'var(--text-dim)' }}>
                  Secured by Razorpay · 256-bit SSL · PCI-DSS compliant
                </p>
              </motion.div>
            )}

            {/* ── DONE ─────────────────────────────────────────────────── */}
            {step === 'done' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)', boxShadow: '0 0 50px rgba(16,185,129,0.4)' }}>
                  <Check size={36} className="text-white" strokeWidth={2.5} />
                </motion.div>
                <div>
                  <p className="font-bold text-xl" style={{ color: 'var(--text)' }}>Payment Confirmed!</p>
                  <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    ₹{total.toLocaleString('en-IN')} is secured in escrow.
                  </p>
                </div>
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-xs" style={{ color: '#10b981' }}>
                    The provider has been notified and has <strong>24 hours</strong> to submit a tracking ID.
                    If they miss the deadline, your payment is <strong>fully refunded</strong>.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── ERROR state fallback ──────────────────────────────────── */}
            {step === 'error' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="py-4 space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={28} style={{ color: '#ef4444' }} />
                  </div>
                  <p className="font-bold text-base" style={{ color: 'var(--text)' }}>Payment Failed</p>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{error}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setStep('summary'); setError(''); }}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
                    Try Again
                  </button>
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    Close
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
