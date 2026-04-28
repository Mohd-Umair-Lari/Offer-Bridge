"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Clock, CheckCircle2, DollarSign, ChevronDown } from 'lucide-react';
import { MOCK_ESCROW } from '@/lib/mockData';

const STATUS_CFG = {
  held:      { label: 'Held',      cls: 'badge-warning', icon: Clock },
  releasing: { label: 'Releasing', cls: 'badge-info',    icon: ChevronDown },
  released:  { label: 'Released',  cls: 'badge-success', icon: CheckCircle2 },
};

const FILTERS = ['all', 'held', 'releasing', 'released'];

export default function Escrow({ escrow: escrowProp, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState({});
  const escrow = escrowProp?.length ? escrowProp : MOCK_ESCROW;

  const totalHeld     = escrow.filter(e => e.status === 'held').reduce((s, e) => s + Number(e.amount), 0);
  const totalReleased = escrow.filter(e => e.status === 'released').reduce((s, e) => s + Number(e.amount), 0);
  const totalFees     = escrow.reduce((s, e) => s + Number(e.fee || 0), 0);

  const updateStatus = async (id, newStatus) => {
    setActing(p => ({ ...p, [id]: true }));
    try {
      const { error } = await supabase.from('escrow').update({ status: newStatus }).eq('id', id);
      if (error) console.error('Escrow update error:', error);
      if (onRefresh) await onRefresh();
    } finally {
      setActing(p => ({ ...p, [id]: false }));
    }
  };

  const filtered = filter === 'all' ? escrow : escrow.filter(e => e.status === filter);

  const summaryStats = [
    { label: 'Funds Held',     value: `₹${totalHeld.toLocaleString('en-IN')}`,     icon: ShieldCheck,  cls: 'stat-warning' },
    { label: 'Released',       value: `₹${totalReleased.toLocaleString('en-IN')}`, icon: CheckCircle2, cls: 'stat-success' },
    { label: 'Platform Fees',  value: `₹${totalFees.toLocaleString('en-IN')}`,     icon: DollarSign,   cls: 'stat-purple'  },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Escrow Management</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Monitor and release buyer funds held in escrow</p>
      </motion.div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4">
        {summaryStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} whileHover={{ y: -2 }} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.cls}`}>
                <Icon size={18} />
              </div>
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filter tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-2">
        {FILTERS.map(f => (
          <motion.button key={f} id={`escrow-filter-${f}`} onClick={() => setFilter(f)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="text-xs px-4 py-2 rounded-xl capitalize font-medium transition"
            style={filter === f
              ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-h))', color: 'white', boxShadow: '0 4px 12px var(--primary-glow)' }
              : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {f === 'all' ? 'All Entries' : f}
          </motion.button>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['ID', 'Deal', 'Parties', 'Amount', 'Fee', 'Status', 'Action'].map(h => (
                  <th key={h} className={`text-[11px] font-semibold uppercase tracking-wider px-5 py-3.5 ${h === 'Amount' || h === 'Fee' ? 'text-right' : h === 'Status' || h === 'Action' ? 'text-center' : 'text-left'}`}
                    style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((entry, i) => {
                  const sc = STATUS_CFG[entry.status] || STATUS_CFG.held;
                  const StatusIcon = sc.icon;
                  return (
                    <motion.tr key={entry.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ borderBottom: '1px solid var(--border2)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-5 py-4 font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
                        {entry.deal_id || entry.id?.slice(0, 8)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{entry.item}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                          {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Buyer: <span className="font-semibold" style={{ color: 'var(--text)' }}>{entry.buyer}</span></p>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>CH: {entry.cardholder}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums" style={{ color: 'var(--text)' }}>₹{Number(entry.amount).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums" style={{ color: '#10b981' }}>₹{Number(entry.fee || 0).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`badge ${sc.cls} gap-1`}>
                          <StatusIcon size={11} />{sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {entry.status === 'held' && (
                          <motion.button id={`release-${entry.id}`} disabled={!!acting[entry.id]}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(entry.id, 'releasing')}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-h))', boxShadow: '0 2px 8px var(--primary-glow)' }}>
                            {acting[entry.id] ? '…' : 'Release'}
                          </motion.button>
                        )}
                        {entry.status === 'releasing' && (
                          <motion.button id={`confirm-${entry.id}`} disabled={!!acting[entry.id]}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => updateStatus(entry.id, 'released')}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                            {acting[entry.id] ? '…' : 'Confirm'}
                          </motion.button>
                        )}
                        {entry.status === 'released' && (
                          <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>Done</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-14 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No entries match this filter.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
