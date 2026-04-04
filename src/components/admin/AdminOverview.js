"use client";
import { MOCK_REQUESTS, MOCK_OFFERS, MOCK_ESCROW, MOCK_DISPUTES } from '@/lib/mockData';
import { DollarSign, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Fashion & Clothing', 'Beauty & Skincare', 'Footwear', 'Mobile & Tablets'];

export default function AdminOverview({ requests, offers, escrow, disputes }) {
  // Use real props, fall back to mock
  const reqs = requests?.length ? requests : MOCK_REQUESTS;
  const offs = offers?.length ? offers : MOCK_OFFERS;
  const esc = escrow?.length ? escrow : MOCK_ESCROW;
  const disps = disputes?.length ? disputes : MOCK_DISPUTES;

  const totalVolume = reqs.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalFees = esc.reduce((s, e) => s + Number(e.fee || 0), 0);
  const openDisputes = disps.filter((d) => d.status !== 'resolved').length;
  const heldEscrow = esc.filter((e) => e.status === 'held').reduce((s, e) => s + Number(e.amount || 0), 0);

  const stats = [
    { label: 'Total Volume', value: `₹${totalVolume.toLocaleString('en-IN')}`, sub: 'all time', icon: <TrendingUp size={18} className="text-[#185FA5]" />, bg: 'bg-[#E6F1FB]' },
    { label: 'Platform Fees', value: `₹${totalFees.toLocaleString('en-IN')}`, sub: 'collected', icon: <DollarSign size={18} className="text-emerald-500" />, bg: 'bg-emerald-50' },
    { label: 'Escrow Held', value: `₹${heldEscrow.toLocaleString('en-IN')}`, sub: 'held currently', icon: <ShieldCheck size={18} className="text-amber-500" />, bg: 'bg-amber-50' },
    { label: 'Open Disputes', value: openDisputes, sub: 'need attention', icon: <AlertTriangle size={18} className="text-red-400" />, bg: 'bg-red-50' },
  ];

  // Category breakdown
  const catData = CATEGORIES.map((cat) => ({
    cat,
    count: reqs.filter((r) => r.category === cat).length,
    volume: reqs.filter((r) => r.category === cat).reduce((s, r) => s + Number(r.amount || 0), 0),
  }));
  const maxVolume = Math.max(...catData.map((d) => d.volume), 1);

  // Status breakdown
  const statusData = [
    { label: 'Pending', count: reqs.filter((r) => r.status === 'pending').length, color: 'bg-amber-400' },
    { label: 'Matched', count: reqs.filter((r) => r.status === 'matched').length, color: 'bg-blue-400' },
    { label: 'Completed', count: reqs.filter((r) => r.status === 'completed').length, color: 'bg-emerald-400' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Platform Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Real-time metrics · {reqs.length} requests · {offs.length} offers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm card-hover">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-2xl font-bold text-[#1a1a2e] tabular-nums">{s.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Volume by Category */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-[#1a1a2e] mb-4">Volume by Category</h2>
          <div className="space-y-3">
            {catData.map((d) => (
              <div key={d.cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{d.cat}</span>
                  <span className="text-gray-800 font-bold">₹{d.volume.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#185FA5] to-[#4B9FE1] rounded-full transition-all duration-700"
                    style={{ width: `${(d.volume / maxVolume) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{d.count} requests</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-[#1a1a2e] mb-4">Request Status</h2>
          <div className="space-y-3">
            {statusData.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${s.color} shrink-0`} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{s.label}</span>
                    <span className="text-gray-800 font-bold">{s.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-full transition-all duration-700`}
                      style={{ width: reqs.length ? `${(s.count / reqs.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-bold text-[#1a1a2e]">{offs.length}</p>
              <p className="text-[10px] text-gray-400">Active Offers</p>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1a2e]">{reqs.length}</p>
              <p className="text-[10px] text-gray-400">Total Requests</p>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1a2e]">{esc.length}</p>
              <p className="text-[10px] text-gray-400">Escrow Entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-[#1a1a2e]">Recent Requests</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {reqs.slice(0, 5).map((r) => (
            <div key={r.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1a1a2e] truncate">{r.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.category}</p>
              </div>
              <p className="font-bold tabular-nums">₹{Number(r.amount).toLocaleString('en-IN')}</p>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium capitalize ${r.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                r.status === 'matched' ? 'bg-blue-50 text-blue-700' :
                  'bg-emerald-50 text-emerald-700'
                }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
