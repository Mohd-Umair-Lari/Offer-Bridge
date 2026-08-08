"use client";
import { motion } from 'framer-motion';
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

const ICON_BG = {
  'stat-purple': 'var(--surface2)',
  'stat-success':'var(--surface2)',
  'stat-warning':'var(--surface2)',
  'stat-info':   'var(--surface2)',
  'stat-danger': 'var(--surface2)',
  'stat-cyan':   'var(--surface2)',
};

export default function StatCard({ label, value, sub, icon: Icon, iconClass = 'stat-purple', delay = 0 }) {
  const countRef = useCountUp(value);
  const iconBg = ICON_BG[iconClass] || 'var(--surface2)';
  const isNumber = !isNaN(Number(String(value).replace(/[₹,]/g, '')));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card cursor-default relative overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="p-5 relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10"
            style={{ background: iconBg }}>
            <Icon size={18} style={{ color: 'var(--text)' }} />
          </div>
        </div>

        <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text)' }}>
          {isNumber ? <span ref={countRef}>{value}</span> : value}
        </p>
        <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{sub}</p>
      </div>
    </motion.div>
  );
}
