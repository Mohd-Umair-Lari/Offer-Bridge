"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Tag, Calendar, Globe, ShieldCheck,
  CreditCard, AlignLeft, ExternalLink, Clock, Inbox,
} from 'lucide-react';

const ALL_CATEGORIES = [
  'All', 'Electronics', 'Fashion & Clothing', 'Beauty & Skincare',
  'Home & Kitchen', 'Books & Stationery', 'Sports & Fitness',
  'Toys & Games', 'Groceries', 'Health & Wellness', 'Footwear',
  'Accessories', 'Gaming', 'Mobile & Tablets', 'Appliances', 'Other',
];

const CATEGORY_COLORS = {
  Electronics: '#8b5cf6', 'Mobile & Tablets': '#3b82f6', Travel: '#06b6d4',
  Hotels: '#14b8a6', Dining: '#f97316', 'Fashion & Clothing': '#ec4899',
  Gaming: '#6366f1', 'Sports & Fitness': '#10b981', Appliances: '#0ea5e9',
};

const container  = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const cardVariant = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function RequestCard({ req }) {
  const color  = CATEGORY_COLORS[req.category] || '#6b7280';
  const daysLeft = req.deadline
    ? Math.max(0, Math.ceil((new Date(req.deadline) - new Date()) / 86_400_000))
    : null;

  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="card flex flex-col overflow-hidden">

      {/* Hero band */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3"
        style={{ borderBottom: '1px solid var(--border2)' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: `${color}18`,
                color,
                border: `1px solid ${color}30`,
              }}>
              {req.category}
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>
              <Globe size={10} /> Public
            </span>
          </div>
          <h3 className="text-sm font-bold leading-tight line-clamp-2" style={{ color: 'var(--text)' }}>
            {req.title}
          </h3>
        </div>

        {/* Amount */}
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold tabular-nums gradient-text">
            ₹{Number(req.amount).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>budget</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border2)' }}>
        {req.deadline && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            Due {new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {daysLeft !== null && (
              <span className={`ml-1 font-semibold ${daysLeft <= 2 ? 'text-red-400' : ''}`}>
                ({daysLeft}d left)
              </span>
            )}
          </span>
        )}
        {req.required_card && req.required_card !== 'Any' && (
          <span className="flex items-center gap-1 font-medium" style={{ color: '#f59e0b' }}>
            <CreditCard size={11} /> Needs {req.required_card}
          </span>
        )}
        {req.required_card === 'Any' && (
          <span className="flex items-center gap-1">
            <ShieldCheck size={11} /> Any card accepted
          </span>
        )}
      </div>

      {/* Description */}
      {req.description && (
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border2)' }}>
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>
            {req.description}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between gap-3 mt-auto">
        {req.product_link ? (
          <a
            href={req.product_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium transition rounded-lg px-3 py-1.5"
            style={{ background: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid rgba(139,92,246,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-dim)'}>
            <ExternalLink size={11} /> View Product
          </a>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>
          <Clock size={10} />
          {req.createdAt
            ? new Date(req.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            : 'Recently posted'}
        </div>
      </div>
    </motion.div>
  );
}

export default function Marketplace({ requests: requestsProp }) {
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');

  // Only show public pending requests
  const all = (requestsProp || []).filter(r => r.is_public !== false && r.status === 'pending');

  const filtered = all.filter(r => {
    const matchCat  = category === 'All' || r.category === category;
    const matchText = search === '' ||
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  // Only show categories that actually exist in data
  const activeCategories = ['All', ...new Set(all.map(r => r.category).filter(Boolean))];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Request Marketplace</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {all.length} open public request{all.length !== 1 ? 's' : ''} — post to yours via <strong>New Request</strong>
        </p>
      </motion.div>

      {/* Search + category filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input
            id="marketplace-search"
            type="text"
            placeholder="Search requests by title, category or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark pl-11"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter size={14} style={{ color: 'var(--text-dim)' }} className="shrink-0" />
          {activeCategories.map(cat => (
            <motion.button
              key={cat}
              onClick={() => setCategory(cat)}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 font-medium transition"
              style={category === cat
                ? { background: 'var(--primary)', color: 'white', boxShadow: '0 2px 10px var(--primary-glow)' }
                : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {cat}
            </motion.button>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {filtered.length} request{filtered.length !== 1 ? 's' : ''} match
        </p>
      </motion.div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="card py-24 text-center space-y-3">
            <Inbox size={36} className="mx-auto" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {all.length === 0 ? 'No public requests yet.' : 'No requests match your filters.'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {all.length === 0 ? 'Be the first — create a New Request and check "Post to Public Marketplace".' : 'Try clearing your search or selecting a different category.'}
            </p>
          </motion.div>
        ) : (
          <motion.div key="grid" variants={container} initial="hidden" animate="visible"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(req => (
              <RequestCard key={req.id} req={req} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
