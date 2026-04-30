"use client";
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

// Animated counter hook
function useCountUp(target, duration = 1.2) {
  const ref = useRef(null);
  useEffect(() => {
    const isNumber = !isNaN(Number(String(target).replace(/[₹,]/g, '')));
    if (!isNumber || !ref.current) return;
    const raw = Number(String(target).replace(/[₹,]/g, ''));
    const prefix = String(target).startsWith('₹') ? '₹' : '';
    let start = 0;
    const step = raw / (duration * 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, raw);
      if (ref.current) {
        ref.current.textContent = prefix + Math.floor(start).toLocaleString('en-IN');
      }
      if (start >= raw) clearInterval(timer);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);
  return ref;
}

const ICON_GRADIENTS = {
  'stat-purple': 'linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)',
  'stat-success':'linear-gradient(135deg,#10b981 0%,#059669 100%)',
  'stat-warning':'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
  'stat-info':   'linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)',
  'stat-danger': 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',
  'stat-cyan':   'linear-gradient(135deg,#06b6d4 0%,#0891b2 100%)',
};
const GLOW_COLORS = {
  'stat-purple': 'rgba(139,92,246,0.25)',
  'stat-success':'rgba(16,185,129,0.25)',
  'stat-warning':'rgba(245,158,11,0.25)',
  'stat-info':   'rgba(59,130,246,0.25)',
  'stat-danger': 'rgba(239,68,68,0.25)',
  'stat-cyan':   'rgba(6,182,212,0.25)',
};
const BG_TINTS = {
  'stat-purple': 'rgba(139,92,246,0.05)',
  'stat-success':'rgba(16,185,129,0.05)',
  'stat-warning':'rgba(245,158,11,0.05)',
  'stat-info':   'rgba(59,130,246,0.05)',
  'stat-danger': 'rgba(239,68,68,0.05)',
  'stat-cyan':   'rgba(6,182,212,0.05)',
};

export default function StatCard({ label, value, sub, icon: Icon, iconClass = 'stat-purple', delay = 0, live = false }) {
  const countRef = useCountUp(value);
  const gradient = ICON_GRADIENTS[iconClass] || ICON_GRADIENTS['stat-purple'];
  const glow     = GLOW_COLORS[iconClass]    || GLOW_COLORS['stat-purple'];
  const tint     = BG_TINTS[iconClass]       || BG_TINTS['stat-purple'];
  const isNumber = !isNaN(Number(String(value).replace(/[₹,]/g, '')));

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.22, type: 'spring', stiffness: 400 } }}
      className="card cursor-default relative overflow-hidden"
      style={{ background: `linear-gradient(145deg,var(--surface) 0%,${tint} 100%)` }}
    >
      {/* Ambient glow */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-60 pointer-events-none"
        style={{ background: `radial-gradient(circle,${glow} 0%,transparent 70%)` }} />

      <div className="p-5 relative">
        {/* Icon + live indicator */}
        <div className="flex items-start justify-between mb-4">
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: gradient, boxShadow: `0 6px 20px ${glow}` }}>
            <Icon size={20} className="text-white" />
          </motion.div>
          {live && (
            <div className="flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>LIVE</span>
            </div>
          )}
        </div>

        {/* Value */}
        <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text)' }}>
          {isNumber ? <span ref={countRef}>{value}</span> : value}
        </p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{sub}</p>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg,transparent,${glow},transparent)` }} />
      </div>
    </motion.div>
  );
}
