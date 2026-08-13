"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Clock, Lock, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({ tx, onClose, onSuccess }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  if (!tx) return null;

  const total = Number(tx.amount);

  const handlePayment = async () => {
    setError('');
    setPaying(true);

    try {
      const checkoutLoaded = await loadRazorpay();
      if (!checkoutLoaded) throw new Error('Could not load Razorpay Checkout. Please check your connection and try again.');

      const { data } = await api.createCheckoutOrder(tx.id || tx._id);
      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'OfferBridges',
        description: tx.product_title || 'Marketplace payment',
        order_id: data.orderId,
        handler: async (payment) => {
          try {
            await api.verifyCheckoutPayment(tx.id || tx._id, payment);
            onSuccess?.();
          } catch (verifyError) {
            setError(verifyError.message || 'Payment was received but could not be verified. Please contact support.');
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        theme: { color: '#7c3aed' },
      });

      razorpay.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed. Please try again.');
        setPaying(false);
      });
      razorpay.open();
    } catch (paymentError) {
      setError(paymentError.message || 'Could not start payment. Please try again.');
      setPaying(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }} onClick={!paying ? onClose : undefined} />

        <motion.div initial={{ opacity: 0, scale: 0.92, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 24 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 40px 100px rgba(0,0,0,0.9)' }}>
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)', color: 'var(--bg)' }}><ShieldCheck size={18} /></div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Secure payment</p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Processed by Razorpay</p>
              </div>
            </div>
            <button onClick={onClose} disabled={paying} className="p-1.5 rounded-lg transition disabled:opacity-50" style={{ color: 'var(--text-dim)' }}><X size={18} /></button>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Amount to pay</p>
              <p className="font-bold text-2xl tabular-nums" style={{ color: 'var(--text)' }}>₹{total.toLocaleString('en-IN')}</p>
              {tx.product_title && <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{tx.product_title}</p>}
            </div>

            <div className="space-y-2.5">
              {[
                { icon: Lock, color: '#10b981', label: 'Your payment is securely processed by Razorpay' },
                { icon: Clock, color: '#3b82f6', label: 'The provider has 24 hours to submit tracking details' },
                { icon: ShieldCheck, color: '#a855f7', label: 'You will be notified as the order progresses' },
              ].map(({ icon: Icon, color, label }) => <div key={label} className="flex items-center gap-3"><div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}22` }}><Icon size={13} style={{ color }} /></div><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p></div>)}
            </div>

            {error && <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}>{error}</p>}

            <motion.button id="razorpay-pay-btn" onClick={handlePayment} disabled={paying} whileHover={{ scale: paying ? 1 : 1.01 }} whileTap={{ scale: paying ? 1 : 0.97 }} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
              <CreditCard size={16} /> {paying ? 'Opening secure checkout…' : `Pay ₹${total.toLocaleString('en-IN')}`}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
