"use client";
import { MOCK_OFFERS } from '@/lib/mockData';
import { Star, BadgeCheck, Search, Filter, Zap, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_CATEGORIES = ['All', 'Electronics', 'Fashion & Clothing', 'Beauty & Skincare', 'Home & Kitchen', 'Books & Stationery', 'Sports & Fitness', 'Toys & Games', 'Groceries', 'Health & Wellness', 'Footwear', 'Accessories', 'Gaming', 'Mobile & Tablets', 'Appliances'];

const BANK_GRADIENTS = {
  Chase: 'linear-gradient(135deg, #1e3a5f 0%, #1a4080 100%)',
  'American Express': 'linear-gradient(135deg, #5c4a1e 0%, #7a6020 100%)',
  Citibank: 'linear-gradient(135deg, #1a2a5e 0%, #2a3a80 100%)',
  Discover: 'linear-gradient(135deg, #5c2000 0%, #8b3010 100%)',
  'Capital One': 'linear-gradient(135deg, #4a0a0a 0%, #700e0e 100%)',
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Marketplace({ offers: offersProp }) {
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [requested, setRequested] = useState({});
  const offers = offersProp?.length ? offersProp : MOCK_OFFERS;

  const filtered = offers.filter(o => {
    const cats = Array.isArray(o.categories) ? o.categories : [];
    return (category === 'All' || cats.includes(category))
      && (search === '' || o.card_name?.toLowerCase().includes(search.toLowerCase()) || o.bank?.toLowerCase().includes(search.toLowerCase()))
      && o.status === 'available';
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Offer Marketplace</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{offers.length} offers available</p>
      </motion.div>

      {/* Search + filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input id="marketplace-search" type="text" placeholder="Search cards or banks…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-dark pl-11" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter size={14} style={{ color: 'var(--text-dim)' }} className="shrink-0" />
          {ALL_CATEGORIES.map(cat => (
            <motion.button key={cat} onClick={() => setCategory(cat)}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 font-medium transition"
              style={category === cat
                ? { background: 'var(--primary)', color: 'white', boxShadow: '0 2px 10px var(--primary-glow)' }
                : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {cat}
            </motion.button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{filtered.length} offers match</p>
      </motion.div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card py-20 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No offers match your filters.</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="visible" className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(offer => {
            const cats = Array.isArray(offer.categories) ? offer.categories : [];
            const done = !!requested[offer.id];
            return (
              <motion.div key={offer.id} variants={cardVariant}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="card overflow-hidden flex flex-col" style={{ cursor: 'default' }}>

                {/* Card header */}
                <div className="p-5 text-white relative overflow-hidden"
                  style={{ background: BANK_GRADIENTS[offer.bank] || 'linear-gradient(135deg, #1e1e3a 0%, #2d2d5e 100%)' }}>
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.03)' }} />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>{offer.bank}</p>
                        <p className="text-sm font-bold mt-0.5">{offer.card_name}</p>
                      </div>
                      {offer.verified && <BadgeCheck size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold">{offer.discount}%</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>discount</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">+{offer.cashback}%</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>cashback</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col gap-3" style={{ background: 'var(--surface)' }}>
                  <div className="flex flex-wrap gap-1">
                    {cats.map(c => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Max amount</span>
                    <span className="text-right font-semibold" style={{ color: 'var(--text)' }}>₹{Number(offer.max_amount).toLocaleString('en-IN')}</span>
                    <span>Holder</span>
                    <span className="text-right font-semibold" style={{ color: 'var(--text)' }}>{offer.holder_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Star size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{Number(offer.rating).toFixed(1)}</span>
                    <span>· {offer.deals_done} deals</span>
                  </div>
                  <motion.button
                    id={`request-offer-${offer.id}`}
                    onClick={() => setRequested(p => ({ ...p, [offer.id]: true }))}
                    disabled={done}
                    whileHover={{ scale: done ? 1 : 1.02 }} whileTap={{ scale: done ? 1 : 0.97 }}
                    className="mt-auto w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                    style={done
                      ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', cursor: 'default' }
                      : { background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', color: 'white', boxShadow: '0 4px 14px var(--primary-glow)' }}>
                    {done ? <><CheckCircle2 size={14} />Request Sent</> : <><Zap size={14} />Request Match</>}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
