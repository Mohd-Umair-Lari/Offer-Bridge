"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle2, Clock, ChevronRight, X } from 'lucide-react';
import { MOCK_DISPUTES } from '@/lib/mockData';

const PRIORITY_CONFIG = {
  high: { color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-400' },
  medium: { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  low: { color: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-300' },
};

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-50 text-red-700', icon: <AlertTriangle size={13} className="text-red-400" /> },
  investigating: { label: 'Investigating', color: 'bg-amber-50 text-amber-700', icon: <Clock size={13} className="text-amber-400" /> },
  resolved: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={13} className="text-emerald-500" /> },
};

export default function Disputes({ disputes: disputesProp, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [acting, setActing] = useState({});

  const disputes = disputesProp?.length ? disputesProp : MOCK_DISPUTES;

  const open = disputes.filter((d) => d.status === 'open').length;
  const investigating = disputes.filter((d) => d.status === 'investigating').length;
  const resolved = disputes.filter((d) => d.status === 'resolved').length;

  const updateStatus = async (id, newStatus) => {
    setActing((prev) => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase.from('disputes').update({ status: newStatus }).eq('id', id);
      if (error) console.error('Dispute update error:', error);
      if (onRefresh) await onRefresh();
      if (newStatus === 'resolved') setSelected(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filtered = filter === 'all' ? disputes : disputes.filter((d) => d.status === filter);
  const selectedDispute = selected ? disputes.find((d) => d.id === selected) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Dispute Resolution</h1>
        <p className="text-sm text-gray-400 mt-0.5">Review and resolve buyer-cardholder disputes</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open', value: open, icon: <AlertTriangle size={18} className="text-red-400" />, bg: 'bg-red-50' },
          { label: 'Investigating', value: investigating, icon: <Clock size={18} className="text-amber-400" />, bg: 'bg-amber-50' },
          { label: 'Resolved', value: resolved, icon: <CheckCircle2 size={18} className="text-emerald-500" />, bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm card-hover">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-[#1a1a2e] tabular-nums">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'open', 'investigating', 'resolved'].map((f) => (
          <button
            key={f}
            id={`dispute-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-2 rounded-lg capitalize transition ${filter === f ? 'bg-[#185FA5] text-white font-semibold' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#185FA5]'
              }`}
          >
            {f === 'all' ? 'All Disputes' : f}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* List */}
        <div className={`space-y-3 ${selectedDispute ? 'w-1/2' : 'w-full'} transition-all`}>
          {filtered.map((d) => {
            const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG.open;
            const pc = PRIORITY_CONFIG[d.priority] || PRIORITY_CONFIG.medium;
            return (
              <div
                key={d.id}
                onClick={() => setSelected(selected === d.id ? null : d.id)}
                className={`bg-white rounded-2xl border p-4 shadow-sm cursor-pointer transition card-hover ${selected === d.id ? 'border-[#185FA5]/40 ring-2 ring-[#185FA5]/10' : 'border-gray-100'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-gray-400">{d.dispute_id || d.id?.slice(0, 8)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border capitalize ${pc.color}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${pc.dot} mr-1`} />
                        {d.priority}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#1a1a2e] truncate">{d.item}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{d.reason}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{d.buyer} vs {d.cardholder}</span>
                      <span>·</span>
                      <span>₹{Number(d.amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium ${sc.color}`}>
                      {sc.icon} {sc.label}
                    </span>
                    <ChevronRight size={14} className={`text-gray-300 transition ${selected === d.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
              No disputes in this category.
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedDispute && (
          <div className="w-1/2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 self-start sticky top-20">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[#1a1a2e]">Dispute Detail</p>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono text-gray-700 text-xs">{selectedDispute.dispute_id || selectedDispute.id?.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Item</span>
                  <span className="text-gray-700 font-medium text-right max-w-[60%] text-xs">{selectedDispute.item}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-[#1a1a2e]">₹{Number(selectedDispute.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Opened</span>
                  <span className="text-gray-700 text-xs">{new Date(selectedDispute.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Complaint</p>
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-3">{selectedDispute.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-gray-400 mb-0.5">Buyer</p>
                  <p className="font-semibold text-gray-800">{selectedDispute.buyer}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-gray-400 mb-0.5">Cardholder</p>
                  <p className="font-semibold text-gray-800">{selectedDispute.cardholder}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {selectedDispute.status === 'open' && (
                <button
                  id={`investigate-${selectedDispute.id}`}
                  disabled={!!acting[selectedDispute.id]}
                  onClick={() => updateStatus(selectedDispute.id, 'investigating')}
                  className="flex-1 py-2.5 text-xs font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {acting[selectedDispute.id] ? 'Updating…' : 'Start Investigation'}
                </button>
              )}
              {(selectedDispute.status === 'open' || selectedDispute.status === 'investigating') && (
                <button
                  id={`resolve-${selectedDispute.id}`}
                  disabled={!!acting[selectedDispute.id]}
                  onClick={() => updateStatus(selectedDispute.id, 'resolved')}
                  className="flex-1 py-2.5 text-xs font-semibold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition disabled:opacity-50"
                >
                  {acting[selectedDispute.id] ? 'Updating…' : 'Mark Resolved'}
                </button>
              )}
              {selectedDispute.status === 'resolved' && (
                <div className="flex-1 py-2.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-xl text-center border border-emerald-200">
                  ✓ Dispute Resolved
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
