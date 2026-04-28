"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Tag, CreditCard, Link as LinkIcon, DollarSign, AlignLeft, ShieldCheck, Globe } from 'lucide-react';

const STATUS_CLS = {
  pending:   'badge-warning',
  matched:   'badge-info',
  completed: 'badge-success',
};

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-dim)' }}>
        <Icon size={13} /><p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  );
}

export default function RequestDetailsModal({ req, onClose }) {
  if (!req) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-lg flex flex-col max-h-[90vh] rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}>

          {/* Header */}
          <div className="px-6 py-5 flex items-start justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{req.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${STATUS_CLS[req.status] || 'badge-neutral'} uppercase tracking-wider text-[10px]`}>{req.status}</span>
                {req.created_at && (
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {new Date(req.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Amount hero */}
            <div className="rounded-2xl p-5 flex items-center justify-between text-white"
              style={{ background: 'linear-gradient(135deg, #0d0d1e 0%, #1a0a2e 50%, #2d1060 100%)', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 4px 24px rgba(139,92,246,0.2)' }}>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Budget Amount</p>
                <p className="text-3xl font-bold tabular-nums mt-0.5">₹{req.amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <DollarSign size={22} style={{ color: '#a78bfa' }} />
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoTile icon={Tag}        label="Category"      value={req.category} />
              <InfoTile icon={Calendar}   label="Deadline"      value={req.deadline ? new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'} />
              <InfoTile icon={CreditCard} label="Required Card" value={req.required_card || 'Any'} />
              <InfoTile icon={req.is_public ? Globe : ShieldCheck} label="Visibility" value={req.is_public ? 'Marketplace' : 'Private Direct'} />
            </div>

            {/* Description */}
            {req.description && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  <AlignLeft size={15} style={{ color: 'var(--text-dim)' }} />Description
                </div>
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap rounded-xl p-4"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {req.description}
                </p>
              </div>
            )}

            {/* Product link */}
            {req.product_link && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  <LinkIcon size={15} style={{ color: 'var(--text-dim)' }} />Product Link
                </div>
                <a href={req.product_link} target="_blank" rel="noopener noreferrer"
                  className="text-sm block truncate rounded-xl p-3 transition"
                  style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)', color: 'var(--primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-dim)'}>
                  {req.product_link}
                </a>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <motion.button onClick={onClose} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: 'var(--surface3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Close Details
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
