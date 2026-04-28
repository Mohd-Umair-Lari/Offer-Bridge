"use client";
import { motion } from 'framer-motion';

// ── Reusable stat card used across all dashboards ─────────────────
export default function StatCard({ label, value, sub, icon: Icon, iconClass = 'stat-purple', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="card card-hover p-5 cursor-default"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconClass}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{sub}</p>
    </motion.div>
  );
}
