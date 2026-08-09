"use client";
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import {
  Plus, CreditCard, CheckCircle2, Tag, Trash2, Globe, Lock,
  AlertCircle, X as XIcon, Pencil, Check, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ── Constants ─────────────────────────────────────────── */
const ALL_BANKS = [
  'HDFC Bank', 'ICICI Bank', 'SBI Card', 'Axis Bank', 'Kotak Mahindra',
  'IndusInd Bank', 'Federal Bank', 'RBL Bank', 'HSBC', 'BOB',
  'IDFC FIRST Bank', 'Yes Bank', 'AU Small Finance', 'OneCard',
  'American Express', 'Citibank', 'Other',
];

const CARD_TYPES = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Diners', 'Other'];

const OFFER_CATEGORIES = [
  'Shopping', 'Electronics', 'Fashion & Clothing', 'Groceries',
  'Travel', 'Hotels', 'Dining', 'Entertainment', 'Fuel',
  'Health & Wellness', 'Mobile Recharge', 'Education', 'All Categories',
];

/* Per-bank gradient definitions (brand colours) */
const BANK_GRADIENTS = {
  'HDFC Bank':         'from-[#004C8C] to-[#002D5C]',
  'ICICI Bank':        'from-[#B02A00] to-[#7D1B00]',
  'SBI Card':          'from-[#1A5276] to-[#0E3B51]',
  'Axis Bank':         'from-[#97144D] to-[#6A0D37]',
  'Kotak Mahindra':    'from-[#EE3524] to-[#A52217]',
  'IndusInd Bank':     'from-[#007A3D] to-[#005229]',
  'Federal Bank':      'from-[#1D4E89] to-[#0F2D52]',
  'RBL Bank':          'from-[#003087] to-[#001A54]',
  'HSBC':              'from-[#DB0011] to-[#960009]',
  'BOB':               'from-[#F5821F] to-[#C05C07]',
  'IDFC FIRST Bank':   'from-[#00529C] to-[#003366]',
  'Yes Bank':          'from-[#0033A0] to-[#002070]',
  'AU Small Finance':  'from-[#E31837] to-[#9B1127]',
  'OneCard':           'from-[#1C1C1C] to-[#111111]',
  'American Express':  'from-[#007BC1] to-[#00527E]',
  'Citibank':          'from-[#003F87] to-[#002456]',
  'Other':             'from-[#4B5563] to-[#1F2937]',
};

function getBankGradient(bank) {
  return BANK_GRADIENTS[bank] || BANK_GRADIENTS['Other'];
}

function isoToMonthYear(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length < 2) return isoDate;
  const [year, month] = parts;
  return `${month}/${year.slice(2)}`;
}

/* ── Inline error ─────────────────────────────────────── */
function InlineError({ msg }) {
  if (!msg) return null;
  return (
    <AnimatePresence>
      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
        <AlertCircle size={11} className="shrink-0" />{msg}
      </motion.p>
    </AnimatePresence>
  );
}

/* ── Category multi-select toggle ─────────────────────── */
function CategoryPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (cat) => {
    if (cat === 'All Categories') {
      onChange(['All Categories']);
      return;
    }
    const filtered = selected.filter(c => c !== 'All Categories');
    if (filtered.includes(cat)) {
      onChange(filtered.filter(c => c !== cat));
    } else {
      onChange([...filtered, cat]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
        Offer Categories <span className="font-normal" style={{ color: 'var(--text-dim)' }}>(which purchases does your card benefit?)</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between text-sm transition"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        <span style={{ color: selected.length ? 'var(--text)' : 'var(--text-dim)' }}>
          {selected.length ? selected.join(', ') : 'Select applicable categories'}
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-1 p-2 rounded-xl flex flex-wrap gap-1.5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {OFFER_CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => toggle(cat)}
                className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition"
                style={selected.includes(cat)
                  ? { background: 'var(--primary)', color: 'var(--bg)' }
                  : { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {cat}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Add/Edit card form ───────────────────────────────── */
const BLANK_CARD = {
  bank: 'HDFC Bank', otherBank: '', cardType: 'Visa', name: '',
  last4: '', expiry: '', limit: '', isPublic: true, categories: [],
};

function CardForm({ initial = BLANK_CARD, onSave, onCancel, isSaving }) {
  const [card, setCard] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setCard(p => ({ ...p, [field]: val }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!card.name.trim()) e.name = 'Card nickname is required';
    if (!card.last4 || !/^\d{4}$/.test(card.last4)) e.last4 = 'Must be exactly 4 digits';
    if (!card.expiry || !/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = 'Format: MM/YY';
    if (!card.limit || isNaN(Number(card.limit)) || Number(card.limit) <= 0) e.limit = 'Enter a valid card limit';
    if (card.bank === 'Other' && !card.otherBank.trim()) e.otherBank = 'Specify your bank / card issuer';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(card);
  };

  const isOther = card.bank === 'Other';

  return (
    <motion.form onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 space-y-4"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>

      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
        {initial === BLANK_CARD ? '➕ Add New Card' : '✏️ Edit Card'}
      </p>

      {/* Row 1: Bank + Card Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Bank / Issuer</label>
          <select value={card.bank} onChange={set('bank')} className="input-dark text-sm w-full">
            {ALL_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Card Network</label>
          <select value={card.cardType} onChange={set('cardType')} className="input-dark text-sm w-full">
            {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Other bank text input */}
      <AnimatePresence>
        {isOther && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
              Card Issuer Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input value={card.otherBank} onChange={set('otherBank')}
              placeholder="e.g. OneCard, IndusInd, Scapia, Jupiter..."
              className="input-dark text-sm w-full" />
            <InlineError msg={errors.otherBank} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row 2: Card Name + Last 4 + Expiry */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1">
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            Card Nickname <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input value={card.name} onChange={set('name')} placeholder="e.g. Millennia, Regalia, Swiggy..."
            className="input-dark text-sm w-full" />
          <InlineError msg={errors.name} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            Last 4 Digits <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input value={card.last4} onChange={set('last4')} placeholder="1234" maxLength={4}
            className="input-dark text-sm w-full font-mono" />
          <InlineError msg={errors.last4} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            Expiry <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input value={card.expiry} onChange={set('expiry')} placeholder="MM/YY" maxLength={5}
            className="input-dark text-sm w-full font-mono" />
          <InlineError msg={errors.expiry} />
        </div>
      </div>

      {/* Row 3: Limit + Marketplace toggle */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            Card Limit (₹) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
              style={{ color: 'var(--text-muted)' }}>₹</span>
            <input type="number" min="1" value={card.limit} onChange={set('limit')} placeholder="50000"
              className="input-dark text-sm w-full pl-7" />
          </div>
          <InlineError msg={errors.limit} />
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <input type="checkbox" checked={card.isPublic} onChange={set('isPublic')}
              className="w-4 h-4 rounded" style={{ accentColor: 'var(--primary)' }} />
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>List on Marketplace</p>
              <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Let buyers find your card offers</p>
            </div>
          </label>
        </div>
      </div>

      {/* Categories */}
      <CategoryPicker selected={card.categories} onChange={cats => setCard(p => ({ ...p, categories: cats }))} />

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <motion.button type="submit" disabled={isSaving}
          whileHover={{ scale: isSaving ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
          className="btn-primary px-5 py-2.5 text-sm">
          {isSaving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Card</>}
        </motion.button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          Cancel
        </button>
      </div>
    </motion.form>
  );
}

/* ── Main component ───────────────────────────────────── */
export default function MyCards({ offers, userId, onRefresh }) {
  const [showAdd, setShowAdd]     = useState(false);
  const [editCard, setEditCard]   = useState(null);   // card being edited
  const [isSaving, setIsSaving]   = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [saveError, setSaveError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const cards = useMemo(() => {
    if (!offers) return { all: [], marketplace: [], private: [] };
    const allCards = offers.map(o => ({
      id: o.id || o._id,
      name: o.card_name,
      type: o.card_type || 'Visa',
      last4: o.last4 || '0000',
      expiry: isoToMonthYear(o.expiry) || '12/28',
      bank: o.bank || 'Other',
      gradient: getBankGradient(o.bank || 'Other'),
      categories: o.categories?.length ? o.categories : ['Shopping', 'Electronics'],
      status: o.status || 'active',
      limit: o.max_amount || 0,
      is_public: o.is_public !== false,
      raw: o,
    }));
    return {
      all: allCards,
      marketplace: allCards.filter(c => c.is_public),
      private: allCards.filter(c => !c.is_public),
    };
  }, [offers]);

  const displayedCards =
    filterType === 'marketplace' ? cards.marketplace :
    filterType === 'private'     ? cards.private :
    cards.all;

  /* ── Remove ───────────────────────────────────────────── */
  const handleRemove = useCallback(async (id) => {
    if (!confirm('Remove this card? This cannot be undone.')) return;
    try {
      await api.remove('offers', id);
      if (onRefresh) onRefresh();
    } catch (err) {
      setSaveError('Failed to remove card: ' + err.message);
    }
  }, [onRefresh]);

  /* ── Toggle marketplace visibility ───────────────────── */
  const handleTogglePublic = useCallback(async (card) => {
    setTogglingId(card.id);
    try {
      await api.update('offers', card.id, { is_public: !card.is_public });
      if (onRefresh) onRefresh();
    } catch (err) {
      setSaveError('Failed to update visibility: ' + err.message);
    } finally {
      setTogglingId(null);
    }
  }, [onRefresh]);

  /* ── Add ─────────────────────────────────────────────── */
  const handleAdd = useCallback(async (cardData) => {
    setIsSaving(true);
    setSaveError('');
    let expiryDate = null;
    if (cardData.expiry.includes('/')) {
      const [mm, yy] = cardData.expiry.split('/');
      if (mm && yy) expiryDate = `20${yy}-${mm.padStart(2,'0')}-01`;
    }
    const finalBank = cardData.bank === 'Other' ? (cardData.otherBank.trim() || 'Other') : cardData.bank;
    try {
      await api.create('offers', {
        user_id:    userId,
        bank:       finalBank,
        card_name:  cardData.name.trim(),
        card_type:  cardData.cardType,
        last4:      String(cardData.last4).padStart(4, '0'),
        expiry:     expiryDate,
        max_amount: Number(cardData.limit),
        is_public:  cardData.isPublic,
        categories: cardData.categories,
        status:     'available',
        holder_name: finalBank,
      });
      setShowAdd(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setSaveError('Error saving card: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [userId, onRefresh]);

  /* ── Edit ────────────────────────────────────────────── */
  const handleEdit = useCallback(async (cardData) => {
    if (!editCard) return;
    setIsSaving(true);
    setSaveError('');
    let expiryDate = null;
    if (cardData.expiry.includes('/')) {
      const [mm, yy] = cardData.expiry.split('/');
      if (mm && yy) expiryDate = `20${yy}-${mm.padStart(2,'0')}-01`;
    }
    const finalBank = cardData.bank === 'Other' ? (cardData.otherBank.trim() || 'Other') : cardData.bank;
    try {
      await api.update('offers', editCard.id, {
        bank:       finalBank,
        card_name:  cardData.name.trim(),
        card_type:  cardData.cardType,
        last4:      String(cardData.last4).padStart(4, '0'),
        expiry:     expiryDate,
        max_amount: Number(cardData.limit),
        is_public:  cardData.isPublic,
        categories: cardData.categories,
        holder_name: finalBank,
      });
      setEditCard(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setSaveError('Error updating card: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [editCard, onRefresh]);

  const tabs = [
    { id: 'all',         label: 'All Cards',    icon: CreditCard, count: cards.all.length },
    { id: 'marketplace', label: 'Marketplace',  icon: Globe,      count: cards.marketplace.length },
    { id: 'private',     label: 'Private',      icon: Lock,       count: cards.private.length },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Cards</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Manage your credit/debit cards and their active marketplace offers
          </p>
        </div>
        <motion.button id="add-card-btn" onClick={() => { setShowAdd(p => !p); setEditCard(null); setSaveError(''); }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          className="btn-primary px-4 py-2.5 text-sm">
          <Plus size={15} /> Add Card
        </motion.button>
      </motion.div>

      {/* Global error */}
      <AnimatePresence>
        {saveError && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">{saveError}</span>
            <button onClick={() => setSaveError('')}><XIcon size={12} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab filter */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setFilterType(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
            style={filterType === tab.id
              ? { background: 'var(--primary)', color: 'var(--bg)' }
              : { color: 'var(--text-muted)' }}>
            <tab.icon size={13} />
            {tab.label}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: filterType === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--surface3)', color: filterType === tab.id ? '#fff' : 'var(--text-dim)' }}>
              {tab.count}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <CardForm key="add-form" initial={BLANK_CARD} isSaving={isSaving}
            onSave={handleAdd} onCancel={() => { setShowAdd(false); setSaveError(''); }} />
        )}
      </AnimatePresence>

      {/* Cards grid */}
      <AnimatePresence mode="wait">
        {displayedCards.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-dashed py-20 text-center"
            style={{ borderColor: 'var(--border)' }}>
            <CreditCard size={36} className="mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {cards.all.length === 0 ? 'No cards added yet' :
               filterType === 'marketplace' ? 'No cards listed on marketplace' :
               'No private-only cards'}
            </p>
            {cards.all.length === 0 && (
              <button onClick={() => setShowAdd(true)} className="mt-3 text-xs font-semibold transition"
                style={{ color: 'var(--primary)' }}>
                Add your first card →
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div key="grid" className="grid md:grid-cols-2 gap-5"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
            initial="hidden" animate="visible">
            {displayedCards.map(card => (
              <motion.div key={card.id}
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
                className="space-y-3">

                {/* Edit form inline */}
                <AnimatePresence>
                  {editCard?.id === card.id && (
                    <CardForm key={`edit-${card.id}`}
                      initial={{
                        bank: ALL_BANKS.includes(card.bank) ? card.bank : 'Other',
                        otherBank: ALL_BANKS.includes(card.bank) ? '' : card.bank,
                        cardType: card.type,
                        name: card.name,
                        last4: card.last4,
                        expiry: card.expiry,
                        limit: String(card.limit),
                        isPublic: card.is_public,
                        categories: card.categories,
                      }}
                      isSaving={isSaving}
                      onSave={handleEdit}
                      onCancel={() => setEditCard(null)} />
                  )}
                </AnimatePresence>

                {/* Card visual */}
                <div className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white relative overflow-hidden shadow-lg aspect-[1.586/1]`}>
                  <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                  <div className="relative h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-white/60 uppercase tracking-widest">{card.bank}</p>
                        <p className="font-bold text-sm mt-0.5">{card.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                          {card.type}
                        </span>
                        <CreditCard size={18} className="text-white/50" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-mono tracking-widest">•••• •••• •••• {card.last4}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-[9px] text-white/50 uppercase">Expires</p>
                          <p className="text-xs font-semibold">{card.expiry}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-white/50 uppercase">Limit</p>
                          <p className="text-xs font-semibold">₹{Number(card.limit).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card info panel */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold`}
                        style={card.is_public
                          ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                          : { background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                        {card.is_public ? '🟢 Marketplace' : '🔒 Private'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                        Limit: ₹{Number(card.limit).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button id={`edit-card-${card.id}`} onClick={() => { setEditCard(card); setShowAdd(false); }}
                        className="p-1.5 rounded-lg transition"
                        style={{ color: 'var(--text-dim)', background: 'var(--surface2)', border: '1px solid var(--border)' }}
                        title="Edit card">
                        <Pencil size={12} />
                      </button>
                      <button id={`remove-card-${card.id}`} onClick={() => handleRemove(card.id)}
                        className="p-1.5 rounded-lg transition hover:bg-red-500/10"
                        style={{ color: 'var(--text-dim)', background: 'var(--surface2)', border: '1px solid var(--border)' }}
                        title="Remove card">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Offer categories */}
                  <div className="flex flex-wrap gap-1.5">
                    {card.categories.map((cat, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
                        style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        <CheckCircle2 size={10} style={{ color: '#10b981' }} />
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Marketplace toggle button */}
                  <motion.button
                    id={`list-card-${card.id}`}
                    onClick={() => handleTogglePublic(card)}
                    disabled={togglingId === card.id}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    style={card.is_public
                      ? { background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }
                      : { background: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                    {togglingId === card.id
                      ? <><Loader2 size={11} className="animate-spin" /> Updating…</>
                      : card.is_public
                      ? <><CheckCircle2 size={11} /> Listed on Marketplace — click to make private</>
                      : <><Tag size={11} /> Post to Marketplace</>}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
