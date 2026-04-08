"use client";
import { useState } from 'react';
import { ShieldCheck, Clock, CheckCircle2, DollarSign, ChevronDown } from 'lucide-react';
import { MOCK_ESCROW } from '@/lib/mockData';

const STATUS_CONFIG = {
  held: { label: 'Held', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={13} className="text-amber-500" /> },
  releasing: { label: 'Releasing', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <ChevronDown size={13} className="text-blue-500" /> },
  released: { label: 'Released', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={13} className="text-emerald-500" /> },
};

export default function Escrow({ escrow: escrowProp, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState({});

  // Use live prop or fallback to mock
  const escrow = escrowProp?.length ? escrowProp : MOCK_ESCROW;

  const totalHeld = escrow.filter((e) => e.status === 'held').reduce((s, e) => s + Number(e.amount), 0);
  const totalReleased = escrow.filter((e) => e.status === 'released').reduce((s, e) => s + Number(e.amount), 0);
  const totalFees = escrow.reduce((s, e) => s + Number(e.fee || 0), 0);

  const updateStatus = async (id, newStatus) => {
    setActing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/escrow/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const json = await res.json();
        console.error('API update error:', json.error);
      }
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filtered = filter === 'all' ? escrow : escrow.filter((e) => e.status === filter);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Escrow Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monitor and release buyer funds held in escrow</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Funds Held', value: `₹${totalHeld.toLocaleString('en-IN')}`, icon: <ShieldCheck size={18} className="text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'Released', value: `₹${totalReleased.toLocaleString('en-IN')}`, icon: <CheckCircle2 size={18} className="text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Platform Fees', value: `₹${totalFees.toLocaleString('en-IN')}`, icon: <DollarSign size={18} className="text-[#185FA5]" />, bg: 'bg-[#E6F1FB]' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm card-hover">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-xl font-bold text-[#1a1a2e] tabular-nums">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'held', 'releasing', 'released'].map((f) => (
          <button
            key={f}
            id={`escrow-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-2 rounded-lg capitalize transition ${filter === f
              ? 'bg-[#185FA5] text-white font-semibold'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-[#185FA5]'
              }`}
          >
            {f === 'all' ? 'All Entries' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['ID', 'Deal', 'Parties', 'Amount', 'Fee', 'Status', 'Action'].map((h) => (
                  <th key={h} className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3 ${h === 'Amount' || h === 'Fee' ? 'text-right' : h === 'Status' || h === 'Action' ? 'text-center' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((entry) => {
                const sc = STATUS_CONFIG[entry.status] || STATUS_CONFIG.held;
                const isActing = !!acting[entry.id];
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-4 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {entry.deal_id || entry.id?.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#1a1a2e] text-sm">{entry.item}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-gray-700">Buyer: <span className="font-medium">{entry.buyer}</span></p>
                      <p className="text-xs text-gray-400">CH: {entry.cardholder}</p>
                    </td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums">₹{Number(entry.amount).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-right text-emerald-600 font-medium tabular-nums">₹{Number(entry.fee || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium border ${sc.color}`}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {entry.status === 'held' && (
                        <button
                          id={`release-${entry.id}`}
                          disabled={isActing}
                          onClick={() => updateStatus(entry.id, 'releasing')}
                          className="text-xs px-3 py-1.5 bg-[#185FA5] text-white rounded-lg hover:bg-[#145085] transition font-medium disabled:opacity-50"
                        >
                          {isActing ? '…' : 'Release'}
                        </button>
                      )}
                      {entry.status === 'releasing' && (
                        <button
                          id={`confirm-${entry.id}`}
                          disabled={isActing}
                          onClick={() => updateStatus(entry.id, 'released')}
                          className="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50"
                        >
                          {isActing ? '…' : 'Confirm'}
                        </button>
                      )}
                      {entry.status === 'released' && (
                        <span className="text-xs text-gray-300 font-medium">Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No entries match this filter.</div>
        )}
      </div>
    </div>
  );
}
