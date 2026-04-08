"use client";
import { TrendingDown, CheckCircle2, Clock, Tag, ArrowUpRight } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  matched: 'bg-blue-50 text-blue-700 border border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const CATEGORY_STYLES = {
  Electronics: 'bg-violet-50 text-violet-700',
  'Fashion & Clothing': 'bg-pink-50 text-pink-700',
  'Beauty & Skincare': 'bg-rose-50 text-rose-700',
  'Home & Kitchen': 'bg-orange-50 text-orange-700',
  'Books & Stationery': 'bg-yellow-50 text-yellow-700',
  'Sports & Fitness': 'bg-green-50 text-green-700',
  'Toys & Games': 'bg-purple-50 text-purple-700',
  Groceries: 'bg-lime-50 text-lime-700',
  'Health & Wellness': 'bg-teal-50 text-teal-700',
  Footwear: 'bg-amber-50 text-amber-700',
  Accessories: 'bg-sky-50 text-sky-700',
  Gaming: 'bg-indigo-50 text-indigo-700',
  'Mobile & Tablets': 'bg-blue-50 text-blue-700',
  Appliances: 'bg-cyan-50 text-cyan-700',
};

import { useState } from 'react';
import RequestDetailsModal from '@/components/shared/RequestDetailsModal';

export default function BuyerDashboard({ requests = [] }) {
  const [selectedReq, setSelectedReq] = useState(null);

  const pending = requests.filter((r) => r.status === 'pending').length;
  const matched = requests.filter((r) => r.status === 'matched').length;
  const completed = requests.filter((r) => r.status === 'completed').length;
  const saved = requests
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount * 0.12, 0);

  const stats = [
    {
      label: 'Pending',
      value: pending,
      sub: 'awaiting match',
      icon: <Clock size={18} className="text-amber-500" />,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      label: 'Matched',
      value: matched,
      sub: 'in progress',
      icon: <ArrowUpRight size={18} className="text-blue-500" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'Completed',
      value: completed,
      sub: 'successful deals',
      icon: <CheckCircle2 size={18} className="text-emerald-500" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Total Saved',
      value: `₹${saved.toLocaleString('en-IN')}`,
      sub: 'est. discount value',
      icon: <TrendingDown size={18} className="text-[#185FA5]" />,
      bg: 'bg-[#E6F1FB]',
      border: 'border-blue-100',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl relative">
      {selectedReq && (
        <RequestDetailsModal req={selectedReq} onClose={() => setSelectedReq(null)} />
      )}
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Buyer Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track your purchase requests and savings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-white rounded-2xl p-4 border ${s.border} shadow-sm card-hover`}
          >
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-[#1a1a2e] tabular-nums">{s.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#1a1a2e]">Recent Requests</h2>
            <p className="text-xs text-gray-400 mt-0.5">{requests.length} total</p>
          </div>
          <button className="text-xs text-[#185FA5] hover:underline transition">View all →</button>
        </div>

        <div className="divide-y divide-gray-50">
          {requests.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Tag size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No requests yet.</p>
              <p className="text-xs text-gray-300 mt-1">Create your first request to get started.</p>
            </div>
          ) : (
            requests.slice(0, 6).map((req) => (
              <div
                key={req._id}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/60 transition group"
              >
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_STYLES[req.category] || 'bg-gray-100 text-gray-600'
                    }`}
                >
                  {req.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a2e] truncate group-hover:text-[#185FA5] transition">
                    {req.title}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Due {new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm font-bold text-[#1a1a2e] tabular-nums shrink-0">
                  ₹{req.amount.toLocaleString('en-IN')}
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[req.status]}`}
                  >
                    {req.status}
                  </span>
                  <button 
                    onClick={() => setSelectedReq(req)}
                    className="text-xs font-semibold text-[#185FA5] bg-[#E6F1FB] hover:bg-[#185FA5] hover:text-white transition px-3 py-1.5 rounded-lg border border-[#185FA5]/10"
                  >
                    See Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
