"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle2, Clock, ChevronRight, X } from 'lucide-react';
import { MOCK_DISPUTES } from '@/lib/mockData';

const PRIORITY_CFG = {
  high:   { dot: '#ef4444', cls: 'badge-danger'  },
  medium: { dot: '#f59e0b', cls: 'badge-warning' },
  low:    { dot: '#64748b', cls: 'badge-neutral' },
};
const STATUS_CFG = {
  open:          { label: 'Open',          cls: 'badge-danger',  icon: AlertTriangle },
  investigating: { label: 'Investigating', cls: 'badge-warning', icon: Clock        },
  resolved:      { label: 'Resolved',      cls: 'badge-success', icon: CheckCircle2 },
};

export default function Disputes({ disputes: disputesProp, onRefresh }) {
  const [filter, setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [acting, setActing]   = useState({});
  const disputes = disputesProp?.length ? disputesProp : MOCK_DISPUTES;

  const open = disputes.filter(d => d.status === 'open').length;
  const inv  = disputes.filter(d => d.status === 'investigating').length;
  const res  = disputes.filter(d => d.status === 'resolved').length;

  const updateStatus = async (id, newStatus) => {
    setActing(p => ({ ...p, [id]: true }));
    try {
      const { error } = await supabase.from('disputes').update({ status: newStatus }).eq('id', id);
      if (error) console.error('Dispute update error:', error);
      if (onRefresh) await onRefresh();
      if (newStatus === 'resolved') setSelected(null);
    } finally {
      setActing(p => ({ ...p, [id]: false }));
    }
  };

  const filtered = filter === 'all' ? disputes : disputes.filter(d => d.status === filter);
  const selectedDispute = selected ? disputes.find(d => d.id === selected) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Dispute Resolution</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Review and resolve buyer-cardholder disputes</p>
      </motion.div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open',         value: open, cls: 'stat-danger',  icon: AlertTriangle },
          { label: 'Investigating',value: inv,  cls: 'stat-warning', icon: Clock         },
          { label: 'Resolved',     value: res,  cls: 'stat-success', icon: CheckCircle2  },
        ].map(s => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} whileHover={{ y: -2 }} className="card p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.cls}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-2">
        {['all', 'open', 'investigating', 'resolved'].map(f => (
          <motion.button key={f} id={`dispute-filter-${f}`} onClick={() => setFilter(f)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="text-xs px-4 py-2 rounded-xl capitalize font-medium transition"
            style={filter === f
              ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-h))', color: 'white', boxShadow: '0 4px 12px var(--primary-glow)' }
              : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {f === 'all' ? 'All Disputes' : f}
          </motion.button>
        ))}
      </motion.div>

      <div className="flex gap-4">
        {/* List */}
        <div className={`space-y-3 ${selectedDispute ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          {filtered.map((d, i) => {
            const sc = STATUS_CFG[d.status] || STATUS_CFG.open;
            const pc = PRIORITY_CFG[d.priority] || PRIORITY_CFG.medium;
            const StatusIcon = sc.icon;
            return (
              <motion.div key={d.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(selected === d.id ? null : d.id)}
                whileHover={{ y: -1, transition: { duration: 0.15 } }}
                className="card p-4 cursor-pointer transition"
                style={selected === d.id ? { borderColor: 'rgba(139,92,246,0.4)', boxShadow: '0 0 0 3px var(--primary-dim)' } : {}}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>{d.dispute_id || d.id?.slice(0, 8)}</span>
                      <span className={`badge ${pc.cls} gap-1`}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: pc.dot }} />
                        {d.priority}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{d.item}</p>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{d.reason}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                      <span>{d.buyer} vs {d.cardholder}</span>
                      <span>·</span>
                      <span>₹{Number(d.amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge ${sc.cls} gap-1`}>
                      <StatusIcon size={10} />{sc.label}
                    </span>
                    <ChevronRight size={14} className={`transition-transform ${selected === d.id ? 'rotate-90' : ''}`} style={{ color: 'var(--text-dim)' }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="card py-14 text-center text-sm" style={{ color: 'var(--text-muted)', borderStyle: 'dashed' }}>
              No disputes in this category.
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedDispute && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="w-1/2 card p-5 space-y-4 self-start sticky top-20">
              <div className="flex items-center justify-between">
                <p className="font-semibold" style={{ color: 'var(--text)' }}>Dispute Detail</p>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg transition"
                  style={{ color: 'var(--text-dim)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface2)' }}>
                  {[
                    { label: 'ID',     val: selectedDispute.dispute_id || selectedDispute.id?.slice(0, 8), mono: true },
                    { label: 'Item',   val: selectedDispute.item },
                    { label: 'Amount', val: `₹${Number(selectedDispute.amount).toLocaleString('en-IN')}`, bold: true },
                    { label: 'Opened', val: new Date(selectedDispute.created_at).toLocaleDateString() },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                      <span className={`${row.mono ? 'font-mono text-xs' : ''} ${row.bold ? 'font-bold' : 'font-medium'} text-right max-w-[60%] text-xs`}
                        style={{ color: 'var(--text)' }}>{row.val}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-dim)' }}>Complaint</p>
                  <p className="text-sm rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: 'var(--text-muted)' }}>
                    {selectedDispute.reason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl p-3" style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <p className="mb-0.5" style={{ color: 'var(--text-dim)' }}>Buyer</p>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{selectedDispute.buyer}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <p className="mb-0.5" style={{ color: 'var(--text-dim)' }}>Cardholder</p>
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{selectedDispute.cardholder}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {selectedDispute.status === 'open' && (
                  <motion.button id={`investigate-${selectedDispute.id}`}
                    disabled={!!acting[selectedDispute.id]}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => updateStatus(selectedDispute.id, 'investigating')}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-white transition disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                    {acting[selectedDispute.id] ? 'Updating…' : 'Start Investigation'}
                  </motion.button>
                )}
                {(selectedDispute.status === 'open' || selectedDispute.status === 'investigating') && (
                  <motion.button id={`resolve-${selectedDispute.id}`}
                    disabled={!!acting[selectedDispute.id]}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => updateStatus(selectedDispute.id, 'resolved')}
                    className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-white transition disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                    {acting[selectedDispute.id] ? 'Updating…' : 'Mark Resolved'}
                  </motion.button>
                )}
                {selectedDispute.status === 'resolved' && (
                  <div className="flex-1 py-2.5 text-xs font-semibold text-center rounded-xl badge-success"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    ✓ Dispute Resolved
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
