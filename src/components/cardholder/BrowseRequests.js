"use client";
import { useState } from 'react';
import { Search, Filter, Tag, Calendar, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';

const CATEGORY_STYLES = {
  Electronics: 'bg-violet-50 text-violet-700',
  Travel: 'bg-sky-50 text-sky-700',
  Hotels: 'bg-teal-50 text-teal-700',
  Dining: 'bg-orange-50 text-orange-700',
};

export default function BrowseRequests({ requests: reqsProp, offers: offersProp }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [offered, setOffered] = useState({});
  const [tab, setTab] = useState('public'); // 'public' or 'direct'

  // Provider's cards - separate by visibility
  const myOffers = offersProp || [];
  const publicCards = myOffers.filter((o) => o.is_public !== false);
  const privateCards = myOffers.filter((o) => o.is_public === false);
  const myBanks = [...new Set(myOffers.map((o) => o.bank))];

  const allRequests = reqsProp || [];

  // Mapping logic for both public and direct matches
  const getMatches = (requests, cardsToMatch) => {
    return requests.filter((req) => {
      if (req.status !== 'pending') return false;
      return cardsToMatch.some((card) => {
        const bankMatches = req.required_card === 'Any' || card.bank === req.required_card;
        const hasEnoughLimit = Number(card.max_amount || 0) >= Number(req.amount);
        return bankMatches && hasEnoughLimit;
      });
    });
  };

  // Public Marketplace: Public requests matched with public cards
  const publicRequests = allRequests.filter((r) => r.is_public !== false);
  const publicMatches = getMatches(publicRequests, publicCards);

  // Direct Matches: Private requests matched with private cards
  const privateRequests = allRequests.filter((r) => r.is_public === false);
  const directMatches = getMatches(privateRequests, privateCards);

  const matchedRequests = tab === 'public' ? publicMatches : directMatches;
  const categories = ['All', ...new Set(matchedRequests.map((r) => r.category))];

  const filtered = matchedRequests.filter((r) => {
    const matchCat = category === 'All' || r.category === category;
    const matchText = search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  console.log(`[BrowseRequests] Public cards: ${publicCards.length}, Private cards: ${privateCards.length}. Public matches: ${publicMatches.length}, Direct matches: ${directMatches.length}.`);

  const handleOffer = (id) => setOffered((prev) => ({ ...prev, [id]: true }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-[#1a1a2e]">Marketplace</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {tab === 'public' 
            ? `Public marketplace requests matching your cards (${publicCards.length} public cards)`
            : `Private direct match requests (${privateCards.length} private cards)`
          }
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setTab('public');
            setCategory('All');
            setSearch('');
          }}
          className={`px-4 py-3 text-sm font-semibold transition border-b-2 ${
            tab === 'public'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Public Marketplace ({publicMatches.length})
        </button>
        <button
          onClick={() => {
            setTab('direct');
            setCategory('All');
            setSearch('');
          }}
          className={`px-4 py-3 text-sm font-semibold transition border-b-2 ${
            tab === 'direct'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Direct Matches ({directMatches.length})
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="browse-search"
            type="text"
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] transition"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-2 rounded-lg whitespace-nowrap shrink-0 transition ${category === cat
                ? 'bg-[#185FA5] text-white font-semibold'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#185FA5] hover:text-[#185FA5]'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} matched requests</p>

      {/* Request Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-sm text-gray-400">No requests match your filters.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((req) => (
            <div key={req._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm card-hover p-5 flex flex-col gap-4">
              {/* Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[req.category] || 'bg-gray-100 text-gray-600'}`}>
                    {req.category}
                  </span>
                  <h3 className="text-sm font-semibold text-[#1a1a2e] mt-1.5 leading-tight">{req.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{req.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold text-[#1a1a2e]">₹{req.amount.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-gray-400">budget</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Due {new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <Tag size={12} />
                  {req.category}
                </span>
                {req.required_card !== 'Any' && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <ShieldCheck size={12} />
                    Needs {req.required_card}
                  </span>
                )}
              </div>

              {/* Potential earnings */}
              <div className="bg-emerald-50 rounded-xl p-3 text-xs">
                <span className="text-gray-500">Your estimated earning: </span>
                <span className="font-bold text-emerald-700">₹{Math.round(req.amount * 0.02).toLocaleString('en-IN')}</span>
                <span className="text-gray-400"> (2% commission)</span>
              </div>

              {/* CTA */}
              <button
                id={`offer-match-${req._id}`}
                onClick={() => handleOffer(req._id)}
                disabled={!!offered[req._id]}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${offered[req._id]
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : 'bg-[#185FA5] text-white hover:bg-[#145085] active:scale-95'
                  }`}
              >
                {offered[req._id]
                  ? <><CheckCircle2 size={14} /> Offer Sent</>
                  : <><Zap size={14} /> Make an Offer</>
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
