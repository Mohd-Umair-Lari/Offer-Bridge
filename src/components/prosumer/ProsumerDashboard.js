"use client";
import { TrendingDown, TrendingUp, CheckCircle2, Clock, Tag, ArrowUpRight, DollarSign, Star } from 'lucide-react';

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

export default function ProsumerDashboard({ requests = [], offers = [] }) {
  const [selectedReq, setSelectedReq] = useState(null);

  // BUYER AGGREGATES
  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const buyerSaved = requests
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount * 0.12, 0);

  // PROVIDER AGGREGATES
  const myOffers = offers || [];
  const matchedReqs = requests.filter((r) => r.status === 'matched');
  const completedReqs = requests.filter((r) => r.status === 'completed');

  const providerEarned = completedReqs.reduce((sum, r) => sum + r.amount * 0.02, 0);
  const pendingEarnings = matchedReqs.reduce((sum, r) => sum + r.amount * 0.02, 0);

  return (
    <div className="space-y-6 max-w-6xl relative">
      {selectedReq && (
        <RequestDetailsModal req={selectedReq} onClose={() => setSelectedReq(null)} />
      )}
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Prosumer Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your purchases and track your card earnings all in one place</p>
      </div>

      {/* Aggregate Dual Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Buyer View Stats */}
        <div className="bg-white rounded-2xl p-4 border border-[#185FA5]/20 shadow-sm card-hover relative overflow-hidden">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#1a1a2e] tabular-nums">{pendingRequests}</p>
          <p className="text-xs font-semibold text-gray-600 mt-0.5">Pending Purchases</p>
          <p className="text-[10px] text-gray-400">awaiting match</p>
          <div className="absolute top-3 right-3 text-[9px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Buyer</div>
        </div>

        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#185FA5] rounded-2xl p-4 shadow-sm card-hover relative overflow-hidden text-white">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center mb-3">
            <TrendingDown size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold tabular-nums">₹{buyerSaved.toLocaleString('en-IN')}</p>
          <p className="text-xs font-semibold text-white/80 mt-0.5">Total Saved</p>
          <p className="text-[10px] text-white/50">historical aggregated discount</p>
          <div className="absolute top-3 right-3 text-[9px] bg-white/10 text-white font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-white/20">Buyer</div>
        </div>

        {/* Provider View Stats */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-500/20 shadow-sm card-hover relative overflow-hidden">
          <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-[#1a1a2e] tabular-nums">₹{providerEarned.toLocaleString('en-IN')}</p>
          <p className="text-xs font-semibold text-gray-600 mt-0.5">Total Earned</p>
          <p className="text-[10px] text-gray-400">from provided cards</p>
          <div className="absolute top-3 right-3 text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-100">Provider</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm card-hover relative overflow-hidden">
          <div className="w-9 h-9 bg-[#E6F1FB] rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-[#185FA5]" />
          </div>
          <p className="text-2xl font-bold text-[#1a1a2e] tabular-nums">₹{pendingEarnings.toLocaleString('en-IN')}</p>
          <p className="text-xs font-semibold text-gray-600 mt-0.5">Pending Earnings</p>
          <p className="text-[10px] text-gray-400">active matched deals</p>
          <div className="absolute top-3 right-3 text-[9px] bg-gray-50 text-gray-500 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Provider</div>
        </div>
      </div>

      {/* Split Operations Board */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Left Column: Buyer Operations */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[#185FA5]/10">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 rounded-t-2xl">
              <div>
                <h2 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
                  <Tag size={16} className="text-[#185FA5]" />
                  My Active Purchases
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">What you are currently trying to buy</p>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {requests.slice(0, 4).map((req) => (
                <div key={`buyer-${req.id}`} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/60 transition group">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${STATUS_STYLES[req.status]}`}>
                    {req.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a2e] truncate group-hover:text-[#185FA5] transition">
                      {req.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">₹{req.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedReq(req)}
                    className="text-[10px] font-semibold text-[#185FA5] bg-[#E6F1FB] hover:bg-[#185FA5] hover:text-white transition px-2.5 py-1.5 rounded-lg shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    Details
                  </button>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="px-5 py-8 text-center bg-gray-50/30">
                  <p className="text-xs text-gray-400">You have no active purchase requests.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Provider Operations */}
        <div className="space-y-4">
          {/* My Active Offers segment */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-500/10">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 rounded-t-2xl">
              <div>
                <h2 className="font-semibold text-[#1a1a2e] flex items-center gap-2">
                  <Star size={16} className="text-emerald-600" />
                  My Listed Cards
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Your financial offerings</p>
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {myOffers.map((offer) => (
                <div key={`offer-${offer.id}`} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{offer.bank?.[0] ?? '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a2e]">{offer.card_name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Limit: ₹{(offer.max_amount || 0).toLocaleString('en-IN')} • {offer.is_public !== false ? 'Marketplace' : 'Private'}</p>
                  </div>
                </div>
              ))}
              {myOffers.length === 0 && (
                <div className="px-5 py-8 text-center bg-gray-50/30">
                  <p className="text-xs text-gray-400">You have no cards listed to provide.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
