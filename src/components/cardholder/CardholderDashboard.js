"use client";
import { MOCK_OFFERS, MOCK_REQUESTS } from '@/lib/mockData';
import { DollarSign, Star, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  matched: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

export default function CardholderDashboard({ offers: offersProp, requests: reqsProp }) {
  const myOffers = offersProp || [];
  const allReqs = reqsProp || [];
  const matchedReqs = allReqs.filter((r) => r.status === 'matched');
  const completedReqs = allReqs.filter((r) => r.status === 'completed');
  const totalEarned = completedReqs.reduce((sum, r) => sum + r.amount * 0.02, 0);
  const pendingEarned = matchedReqs.reduce((sum, r) => sum + r.amount * 0.02, 0);

  const stats = [
    {
      label: 'Active Offers',
      value: myOffers.length,
      sub: 'listed cards',
      icon: <Star size={18} className="text-amber-500" />,
      bg: 'bg-amber-50',
    },
    {
      label: 'Matched Deals',
      value: matchedReqs.length,
      sub: 'in progress',
      icon: <Clock size={18} className="text-blue-500" />,
      bg: 'bg-blue-50',
    },
    {
      label: 'Total Earned',
      value: `₹${totalEarned.toLocaleString('en-IN')}`,
      sub: 'from completed deals',
      icon: <DollarSign size={18} className="text-emerald-500" />,
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Earnings',
      value: `₹${pendingEarned.toLocaleString('en-IN')}`,
      sub: 'in active deals',
      icon: <TrendingUp size={18} className="text-[#185FA5]" />,
      bg: 'bg-[#E6F1FB]',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Cardholder Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monetise your credit card offers by helping buyers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm card-hover">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold text-[#1a1a2e] tabular-nums">{s.value}</p>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* My Active Offers */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-[#1a1a2e]">My Active Offers</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your listed cards visible to buyers</p>
        </div>
        <div className="divide-y divide-gray-50">
          {myOffers.map((offer) => (
            <div key={offer.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
              <div className="w-10 h-10 bg-gradient-to-br from-[#185FA5] to-blue-700 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{offer.bank[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a1a2e]">{offer.card_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{offer.categories.join(' · ')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[#185FA5]">{offer.discount}% off</p>
                <p className="text-xs text-gray-400">+{offer.cashback}% cashback</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200 shrink-0 capitalize">
                {offer.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-[#1a1a2e]">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {allReqs.length === 0 ? (
            <div className="px-5 py-8 text-center bg-gray-50/30">
              <p className="text-xs text-gray-400">No recent activity.</p>
            </div>
          ) : (
            allReqs.slice(0, 4).map((req) => (
              <div key={req.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition">
                <CheckCircle2 size={16} className={req.status === 'completed' ? 'text-emerald-400' : 'text-gray-300'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1a1a2e] font-medium truncate">{req.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{req.category}</p>
                </div>
                <p className="text-sm font-bold text-gray-800 tabular-nums">₹{req.amount.toLocaleString('en-IN')}</p>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[req.status]}`}>
                  {req.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
