"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Tag, Calendar, Zap, CheckCircle2, Globe, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORY_COLORS = {
  Electronics: '#8b5cf6', Travel: '#06b6d4', Hotels: '#14b8a6', Dining: '#f97316',
  'Fashion & Clothing': '#ec4899', 'Mobile & Tablets': '#3b82f6',
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const card = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// Per-request offer state machine: idle | loading | sent | error
function useOfferState() {
  const [states, setStates] = useState({});
  const set = (id, state) => setStates(p => ({ ...p, [id]: state }));
  return [states, set];
}

export default function BrowseRequests({ requests: reqsProp, offers: offersProp }) {
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [activeTab, setActiveTab] = useState('marketplace');
  const [offerStates, setOfferState] = useOfferState();
  const [errorMsg, setErrorMsg]   = useState('');

  const myOffers    = offersProp || [];
  const myBanks     = myOffers.map(o => o.bank);
  const allRequests = reqsProp  || [];

  const pendingReqs = allRequests.filter(r => {
    if (r.status !== 'pending') return false;
    return myOffers.some(o => {
      const matchesBank    = r.required_card === 'Any' || o.bank === r.required_card;
      const sufficientLimit = Number(o.max_amount || o.limit || 0) >= Number(r.amount);
      return matchesBank && sufficientLimit;
    });
  });

  const displayReqs = pendingReqs.filter(r =>
    activeTab === 'marketplace' ? r.is_public !== false : r.is_public === false
  );
  const categories = ['All', ...new Set(displayReqs.map(r => r.category))];
  const filtered = displayReqs.filter(r => {
    const matchCat  = category === 'All' || r.category === category;
    const matchText = search === '' || r.title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  const tabs = [
    { id: 'marketplace', label: 'Public Marketplace', icon: Globe,       count: pendingReqs.filter(r => r.is_public !== false).length },
    { id: 'direct',      label: 'Direct Matches',     icon: ShieldCheck, count: pendingReqs.filter(r => r.is_public === false).length },
  ];

  const handleMakeOffer = async (req) => {
    if (!myOffers.length) {
      setErrorMsg('You have no active cards listed. Go to My Cards to add one.');
      return;
    }
    // Pick the best matching offer
    const matchingOffer = myOffers.find(o => {
      const matchesBank    = req.required_card === 'Any' || o.bank === req.required_card;
      const sufficientLimit = Number(o.max_amount || o.limit || 0) >= Number(req.amount);
      return matchesBank && sufficientLimit;
    });
    if (!matchingOffer) {
      setErrorMsg('No matching card found for this request.');
      return;
    }

    setOfferState(req.id, 'loading');
    setErrorMsg('');
    try {
      await api.initiatePayment(req.id, matchingOffer.id);
      setOfferState(req.id, 'sent');
    } catch (e) {
      setOfferState(req.id, 'error');
      setErrorMsg(e.message || 'Failed to make offer. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Browse Requests</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Matched to your active cards {myBanks.length > 0 ? `(${myBanks.join(', ')})` : ''}
        </p>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={14} style={{ color: '#ef4444' }} className="shrink-0 mt-0.5" />
            <p className="text-xs flex-1" style={{ color: '#ef4444' }}>{errorMsg}</p>
            <button onClick={() => setErrorMsg('')} className="text-xs" style={{ color: '#ef4444' }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex gap-2">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <motion.button key={t.id} onClick={() => setActiveTab(t.id)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium transition"
              style={isActive
                ? { background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', color: 'white', boxShadow: '0 4px 14px var(--primary-glow)' }
                : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              <Icon size={14} />
              {t.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface3)', color: isActive ? 'white' : 'var(--text-dim)' }}>
                {t.count}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Search + category */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input id="browse-search" type="text" placeholder="Search requests…" value={search}
            onChange={e => setSearch(e.target.value)} className="input-dark pl-11" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter size={14} style={{ color: 'var(--text-dim)' }} className="shrink-0" />
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 font-medium transition"
              style={category === cat
                ? { background: 'var(--primary)', color: 'white' }
                : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {cat}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{filtered.length} open requests</p>
      </motion.div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="card py-20 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No requests match your filters.</p>
          </motion.div>
        ) : (
          <motion.div key="grid" variants={container} initial="hidden" animate="visible"
            className="grid md:grid-cols-2 gap-4">
            {filtered.map(req => {
              const offerState = offerStates[req.id] || 'idle';
              return (
                <motion.div key={req.id} variants={card}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${CATEGORY_COLORS[req.category] || '#6b7280'}15`,
                          color: CATEGORY_COLORS[req.category] || 'var(--text-muted)',
                          border: `1px solid ${CATEGORY_COLORS[req.category] || '#6b7280'}25`,
                        }}>
                        {req.category}
                      </span>
                      <h3 className="text-sm font-semibold mt-2 leading-tight" style={{ color: 'var(--text)' }}>{req.title}</h3>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{req.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>₹{req.amount.toLocaleString('en-IN')}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>budget</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                    <span className="flex items-center gap-1"><Calendar size={12} />Due {new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><Tag size={12} />{req.category}</span>
                    {req.required_card !== 'Any' && (
                      <span className="flex items-center gap-1 font-medium" style={{ color: '#f59e0b' }}>
                        <ShieldCheck size={12} />Needs {req.required_card}
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Your estimated earning: </span>
                    <span className="font-bold" style={{ color: '#10b981' }}>₹{Math.round(req.amount * 0.02).toLocaleString('en-IN')}</span>
                    <span style={{ color: 'var(--text-dim)' }}> (2% commission)</span>
                  </div>

                  <motion.button
                    id={`offer-match-${req.id}`}
                    onClick={() => offerState === 'idle' && handleMakeOffer(req)}
                    disabled={offerState !== 'idle'}
                    whileHover={{ scale: offerState === 'idle' ? 1.02 : 1 }}
                    whileTap={{ scale: offerState === 'idle' ? 0.97 : 1 }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                    style={
                      offerState === 'sent'
                        ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', cursor: 'default' }
                        : offerState === 'loading'
                        ? { background: 'var(--surface2)', color: 'var(--text-dim)', cursor: 'wait', border: '1px solid var(--border)' }
                        : offerState === 'error'
                        ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
                        : { background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', color: 'white', boxShadow: '0 4px 14px var(--primary-glow)' }
                    }>
                    {offerState === 'sent'    && <><CheckCircle2 size={14} />Offer Sent — Awaiting Payment</>}
                    {offerState === 'loading' && <><Loader2 size={14} className="animate-spin" />Sending Offer…</>}
                    {offerState === 'error'   && <><AlertCircle size={14} />Retry Offer</>}
                    {offerState === 'idle'    && <><Zap size={14} />Make an Offer</>}
                  </motion.button>

                  {offerState === 'sent' && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-[10px] text-center" style={{ color: 'var(--text-dim)' }}>
                      The buyer has been notified to complete payment. You'll be alerted once payment is secured.
                    </motion.p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
