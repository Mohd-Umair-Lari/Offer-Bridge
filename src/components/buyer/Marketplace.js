"use client";
import { MOCK_OFFERS } from '@/lib/mockData';
import { Star, BadgeCheck, Search, Filter, Zap, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const ALL_CATEGORIES = ['All', 'Electronics', 'Fashion & Clothing', 'Beauty & Skincare', 'Home & Kitchen', 'Books & Stationery', 'Sports & Fitness', 'Toys & Games', 'Groceries', 'Health & Wellness', 'Footwear', 'Accessories', 'Gaming', 'Mobile & Tablets', 'Appliances'];
const BANK_COLORS = {
  Chase: 'from-blue-900 to-blue-700', 'American Express': 'from-yellow-500 to-amber-600',
  Citibank: 'from-blue-600 to-indigo-700', Discover: 'from-orange-500 to-red-600', 'Capital One': 'from-red-600 to-red-800',
};

export default function Marketplace({ offers: offersProp }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [requested, setRequested] = useState({});
  
  // Use real offers or fallback to mock
  const offers = offersProp?.length ? offersProp : MOCK_OFFERS;

  console.log('[Marketplace] Total public cards available:', offers.length);
  
  // Filter by search and category only
  const filtered = offers.filter((o) => {
    const cats = Array.isArray(o.categories) ? o.categories : [];
    const matchCat = category === 'All' || cats.includes(category);
    const matchText = search === '' || o.card_name?.toLowerCase().includes(search.toLowerCase()) || o.bank?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Offer Marketplace</h1>
        <p className="text-sm text-gray-400 mt-0.5">Browse all public cards available. Click "Request Match" to request a product with any card.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input id="marketplace-search" type="text" placeholder="Search cards…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] transition" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {ALL_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-2 rounded-lg whitespace-nowrap shrink-0 transition ${category === cat ? 'bg-[#185FA5] text-white font-semibold' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#185FA5]'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} cards available</p>
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center"><p className="text-gray-400 text-sm">No cards match your filters.</p></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((offer, index) => {
            const cats = Array.isArray(offer.categories) ? offer.categories : [];
            const cardKey = offer._id || `offer-${index}`;
            return (
              <div key={cardKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm card-hover overflow-hidden flex flex-col">
                <div className={`bg-gradient-to-br ${BANK_COLORS[offer.bank] || 'from-gray-700 to-gray-900'} p-5 text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">{offer.bank}</p>
                        <p className="text-sm font-bold mt-0.5">{offer.card_name}</p>
                      </div>
                      {offer.verified && <BadgeCheck size={16} className="text-white/80 shrink-0" />}
                    </div>
                    <div className="flex items-end justify-between">
                      <div><p className="text-3xl font-bold">{offer.discount}%</p><p className="text-[10px] text-white/60 mt-0.5">discount</p></div>
                      <div className="text-right"><p className="text-sm font-semibold">+{offer.cashback}% CB</p><p className="text-[10px] text-white/60">cashback</p></div>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1">{cats.map((c, i) => <span key={`${c}-${i}`} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{c}</span>)}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Max amount</span><span className="text-gray-800 font-medium text-right">₹{Number(offer.max_amount).toLocaleString('en-IN')}</span>
                    <span>Holder</span><span className="text-gray-800 font-medium text-right">{offer.holder_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="font-semibold text-gray-800">{Number(offer.rating).toFixed(1)}</span>
                    <span>· {offer.deals_done} deals</span>
                  </div>
                  <button id={`request-offer-${offer._id}`} onClick={() => setRequested((p) => ({ ...p, [offer._id]: true }))} disabled={!!requested[offer._id]}
                    className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${requested[offer._id] ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default' : 'bg-[#185FA5] text-white hover:bg-[#145085] active:scale-95'}`}>
                    {requested[offer._id] ? <><CheckCircle2 size={14} /> Request Sent</> : <><Zap size={14} /> Request Match</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
