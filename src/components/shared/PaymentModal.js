"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Clock, Zap, Lock, ArrowRight } from 'lucide-react';

export default function PaymentModal({ tx, onClose }) {
  if (!tx) return null;

  const total = Number(tx.amount);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--primary)', color: 'var(--bg)' }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                  Secure Escrow Payment
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  Protected by OfferBridges Escrow
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition"
              style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">

            {/* Coming Soon Banner */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center gap-4 py-4"
            >
              {/* Icon */}
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  <Clock size={34} style={{ color: '#f59e0b' }} />
                </div>
                <span
                  className="absolute -top-1.5 -right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#f59e0b', color: '#000' }}
                >
                  SOON
                </span>
              </div>

              <div>
                <p className="font-bold text-xl" style={{ color: 'var(--text)' }}>
                  Payment Coming Soon
                </p>
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  We&rsquo;re building a secure escrow payment system. It will be live shortly — stay tuned!
                </p>
              </div>
            </motion.div>

            {/* Transaction summary */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
            >
              <p
                className="text-[10px] uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-dim)' }}
              >
                This transaction
              </p>
              <p className="font-bold text-2xl tabular-nums" style={{ color: 'var(--text)' }}>
                ₹{total.toLocaleString('en-IN')}
              </p>
              {tx.product_title && (
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                  {tx.product_title}
                </p>
              )}
            </div>

            {/* What to expect */}
            <div className="space-y-2.5">
              {[
                { icon: Lock, color: '#10b981', label: 'Funds held in escrow until both sides confirm' },
                { icon: Zap, color: '#3b82f6', label: 'Instant release to provider on delivery' },
                { icon: ShieldCheck, color: '#a855f7', label: 'Auto-refund if provider misses 24h deadline' },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}14`, border: `1px solid ${color}22` }}
                  >
                    <Icon size={13} style={{ color }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Close CTA */}
            <motion.button
              id="payment-close-btn"
              onClick={onClose}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              Got it — check back soon <ArrowRight size={15} />
            </motion.button>

            <p className="text-[10px] text-center" style={{ color: 'var(--text-dim)' }}>
              Payment processing is under active development and will be available soon.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
