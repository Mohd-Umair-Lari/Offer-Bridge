"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import {
  Send, CheckCircle2, Calendar, Tag, AlignLeft,
  Globe, Zap, Loader, ChevronDown, ChevronUp,
  ShoppingBag, CreditCard, AlertCircle, RefreshCw,
  Edit3, PenLine, Plus, X as XIcon,
} from 'lucide-react';

const CATEGORIES = [
  'Electronics', 'Fashion & Clothing', 'Beauty & Skincare',
  'Home & Kitchen', 'Books & Stationery', 'Sports & Fitness',
  'Toys & Games', 'Groceries', 'Health & Wellness', 'Footwear',
  'Accessories', 'Gaming', 'Mobile & Tablets', 'Appliances', 'Other',
];

const BANKS = [
  'Any', 'HDFC Bank', 'ICICI Bank', 'SBI Card', 'Axis Bank',
  'Kotak Mahindra', 'Federal Bank', 'RBL Bank', 'HSBC', 'BOB', 'IDFC FIRST', 'Other',
];

const INITIAL = {
  productLink:        '',
  title:              '',
  amount:             '',
  category:           '',
  deadline:           '',
  description:        '',
  bestCardInfo:       null,   // { bank, discount_amount, final_price, card_name }
  productImage:       '',
  rawOffers:          [],
  merchant:           '',
  isPublic:           true,
  requiredCard:       'Any',  // preferred bank for the offer (saved as required_card)
  manualCardBank:     '',     // manual card entry — bank
  manualCardDiscount: '',     // manual card entry — ₹ discount amount
};

/* ─── Field wrapper ─── */
function Field({ label, icon: Icon, error, children, autoFilled = false, hint = '' }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5"
        style={{ color: 'var(--text-muted)' }}>
        {Icon && <Icon size={13} style={{ color: 'var(--text-dim)' }} />}
        {label}
        {autoFilled && (
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            Auto-filled
          </span>
        )}
        {hint && (
          <span className="text-[10px] ml-auto opacity-70" style={{ color: 'var(--text-dim)' }}>
            {hint}
          </span>
        )}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Merchant pill badge */
function MerchantBadge({ merchant }) {
  if (!merchant) return null;
  const isAmz = merchant === 'amazon';
  const isFlip = merchant === 'flipkart';
  const isMyntra = merchant === 'myntra';

  let bg = 'rgba(124,58,237,0.15)', color = '#7c3aed', border = 'rgba(124,58,237,0.3)', label = '🔗 Merchant';
  if (isAmz) { bg = 'rgba(255,153,0,0.15)'; color = '#ff9900'; border = 'rgba(255,153,0,0.3)'; label = '🛒 Amazon'; }
  if (isFlip) { bg = 'rgba(40,166,228,0.15)'; color = '#28a6e4'; border = 'rgba(40,166,228,0.3)'; label = '🔵 Flipkart'; }
  if (isMyntra) { bg = 'rgba(255,63,108,0.15)'; color = '#ff3f6c'; border = 'rgba(255,63,108,0.3)'; label = '🛍️ Myntra'; }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color, border: `1px solid ${border}` }}>
      {label}
    </span>
  );
}

/* Crawl status stepper */
const STEPS = [
  { key: 'fetch', label: 'Fetching product page…' },
  { key: 'parse', label: 'Extracting product details…' },
  { key: 'offers', label: 'Analysing bank & card offers…' },
  { key: 'done', label: 'Done!' },
];

function CrawlStatus({ step }) {
  if (!step) return null;
  const idx = STEPS.findIndex(s => s.key === step);
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: 'var(--primary)' }}>
      {step !== 'done'
        ? <Loader size={12} className="animate-spin flex-shrink-0" />
        : <CheckCircle2 size={12} className="flex-shrink-0" style={{ color: '#10b981' }} />}
      <span style={{ color: step === 'done' ? '#10b981' : 'var(--primary)' }}>
        {STEPS[idx]?.label}
      </span>
      {step !== 'done' && (
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-dim)' }}>
          {idx + 1}/{STEPS.length - 1}
        </span>
      )}
    </motion.div>
  );
}

/* Raw offers collapsible */
function RawOffersList({ offers }) {
  const [open, setOpen] = useState(false);
  if (!offers?.length) return null;
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 text-xs font-medium w-full text-left"
        style={{ color: 'var(--text-muted)' }}>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {open ? 'Hide' : 'Show'} all {offers.length} bank offer{offers.length !== 1 ? 's' : ''} found
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-2 space-y-1.5">
            {offers.map((o, i) => (
              <li key={i} className="text-xs px-3 py-1.5 rounded"
                style={{ background: 'var(--surface)', color: 'var(--text-muted)', borderLeft: '2px solid rgba(139,92,246,0.3)' }}>
                {o}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Manual Card Discount Entry ─── */
function ManualCardEntry({ bank, discount, amount, onBankChange, onDiscountChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const hasEntry = bank && bank !== 'Any' && Number(discount) > 0;

  return (
    <div className="mt-3">
      {!hasEntry ? (
        <button
          type="button"
          onClick={() => setOpen(p => !p)}
          className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--primary)' }}>
          {open ? <XIcon size={11} /> : <Plus size={11} />}
          {open ? 'Cancel' : 'Add card discount manually'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CreditCard size={12} style={{ color: '#10b981' }} />
            <span style={{ color: '#10b981' }} className="font-semibold">{bank}</span>
            <span style={{ color: 'var(--text-dim)' }}>·</span>
            <span style={{ color: 'var(--text)' }}>₹{Number(discount).toLocaleString('en-IN')} off</span>
            {amount > 0 && (
              <>
                <span style={{ color: 'var(--text-dim)' }}>·</span>
                <span style={{ color: 'var(--text-dim)' }}>Final ₹{Math.max(0, Number(amount) - Number(discount)).toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
          <button type="button" onClick={() => { onBankChange('Any'); onDiscountChange(''); }}
            className="p-1.5 rounded-lg hover:opacity-80 transition"
            style={{ color: 'var(--text-dim)', background: 'var(--surface2)' }}
            title="Remove">
            <XIcon size={12} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {(open && !hasEntry) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2">
            <div className={`grid gap-3 p-3 rounded-xl ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}
              style={{ background: 'var(--surface)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Bank / Card</label>
                <select
                  value={bank || 'Any'}
                  onChange={e => onBankChange(e.target.value)}
                  className="input-dark text-xs w-full">
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Discount Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}>₹</span>
                  <input
                    type="number" min="1"
                    value={discount}
                    onChange={e => onDiscountChange(e.target.value)}
                    placeholder="0"
                    className="input-dark text-xs w-full pl-7"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main component ─── */
export default function NewRequest({ onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [crawlStep, setCrawlStep] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [fromExtension, setFromExtension] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [crawlerFilled, setCrawlerFilled] = useState(false);
  const stepTimerRef = useRef(null);

  /* Load from Chrome extension draft */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const draftId = params.get('draftId');
    if (!draftId) return;

    fetch(`/api/extension/draft?id=${draftId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        setForm(prev => ({
          ...prev,
          productLink: data.productUrl || '',
          title: data.title || '',
          amount: data.price ? data.price.toString() : '',
          bestCardInfo: data.bestOffer?.discountAmount > 0 ? {
            bank: data.bestOffer.bestOfferBank,
            discount_amount: data.bestOffer.discountAmount,
            final_price: data.bestOffer.finalPriceAfterDiscount,
            card_name: data.bestOffer.offerDescription,
          } : null,
        }));
        setFromExtension(true);
        setCrawlerFilled(true);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(() => { });
  }, []);

  const set = field => e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleManualCardBankChange = (bank) => {
    setForm(prev => {
      const disc = Number(prev.manualCardDiscount) || 0;
      const price = Number(prev.amount) || 0;
      const hasDisc = bank && bank !== 'Any' && disc > 0;
      return {
        ...prev,
        manualCardBank: bank,
        requiredCard: bank !== 'Any' ? bank : prev.requiredCard,
        bestCardInfo: hasDisc ? {
          bank,
          discount_amount: disc,
          final_price: Math.max(0, price - disc),
          card_name: `Manual ${bank} Offer`,
        } : (prev.bestCardInfo?.card_name?.startsWith('Manual') ? null : prev.bestCardInfo),
      };
    });
  };

  const handleManualCardDiscountChange = (discVal) => {
    setForm(prev => {
      const disc = Number(discVal) || 0;
      const bank = (prev.manualCardBank && prev.manualCardBank !== 'Any') ? prev.manualCardBank : (prev.requiredCard !== 'Any' ? prev.requiredCard : 'HDFC Bank');
      const price = Number(prev.amount) || 0;
      const hasDisc = disc > 0;
      return {
        ...prev,
        manualCardDiscount: discVal,
        bestCardInfo: hasDisc ? {
          bank,
          discount_amount: disc,
          final_price: Math.max(0, price - disc),
          card_name: `Manual ${bank} Offer`,
        } : (prev.bestCardInfo?.card_name?.startsWith('Manual') ? null : prev.bestCardInfo),
      };
    });
  };

  /* Simulate step progression */
  function startStepTimer() {
    let idx = 0;
    const sequence = ['fetch', 'parse', 'offers'];
    setCrawlStep(sequence[0]);
    stepTimerRef.current = setInterval(() => {
      idx++;
      if (idx < sequence.length) setCrawlStep(sequence[idx]);
      else clearInterval(stepTimerRef.current);
    }, 1800);
  }

  function clearStepTimer() {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }

  /* Manual mode toggles */
  const enterManualMode = () => {
    setManualMode(true);
    setCrawlerFilled(false);
    setFetchError(null);
    setForm(prev => ({
      ...prev,
      title: '', amount: '', bestCardInfo: null,
      productImage: '', rawOffers: [], merchant: '',
    }));
  };

  const exitManualMode = () => {
    setManualMode(false);
    setFetchError(null);
  };

  /* ── Auto-fill handler ── */
  const handleFetchProduct = async () => {
    if (!form.productLink.trim()) { setFetchError('Please enter a product URL'); return; }
    if (!/^https?:\/\/.+/.test(form.productLink)) {
      setFetchError('Must be a valid URL starting with https://');
      return;
    }

    setFetchError(null);
    setCrawlerFilled(false);
    setForm(prev => ({
      ...prev,
      title: '', amount: '', bestCardInfo: null,
      productImage: '', rawOffers: [], merchant: '',
    }));
    startStepTimer();

    try {
      const res = await fetch('/api/crawler/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productUrl: form.productLink }),
      });

      clearStepTimer();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Extraction failed');

      const { product, best_card, raw_offers, merchant } = data;

      setCrawlStep('done');
      setTimeout(() => setCrawlStep(null), 2200);

      setForm(prev => ({
        ...prev,
        title: product.title || '',
        amount: product.price ? product.price.toString() : '',
        productImage: product.image || '',
        merchant: merchant || '',
        rawOffers: raw_offers || [],
        bestCardInfo: best_card?.discount_amount > 0 ? {
          bank: best_card.bank || '',
          discount_amount: best_card.discount_amount || 0,
          final_price: best_card.final_price || (product.price - best_card.discount_amount),
          card_name: best_card.card_name || '',
        } : null,
      }));

      setCrawlerFilled(true);
      setFetchError(null);
    } catch (err) {
      clearStepTimer();
      setCrawlStep(null);
      const msg = err.message || 'Could not fetch product. Try again.';
      const isBlockMsg = msg.toLowerCase().includes('blocking')
        || msg.toLowerCase().includes('blocked')
        || msg.toLowerCase().includes('bot')
        || msg.includes('503') || msg.includes('500')
        || msg.includes('403') || msg.includes('404');
      if (isBlockMsg) {
        let site = 'The site';
        if (msg.toLowerCase().includes('amazon')) site = 'Amazon';
        else if (msg.toLowerCase().includes('flipkart')) site = 'Flipkart';
        else if (msg.toLowerCase().includes('myntra')) site = 'Myntra';
        else if (form.productLink?.toLowerCase().includes('amazon')) site = 'Amazon';
        else if (form.productLink?.toLowerCase().includes('flipkart')) site = 'Flipkart';
        else if (form.productLink?.toLowerCase().includes('myntra')) site = 'Myntra';
        setFetchError(`${site} is blocking automated access from this server. Try using the Chrome Extension instead.`);
      } else {
        setFetchError(msg);
      }
    }
  };

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Product name is required';
    if (!form.amount || isNaN(Number(form.amount)) || +form.amount <= 0) errs.amount = 'Enter a valid amount';
    if (!form.category) errs.category = 'Select a category';
    if (!form.deadline) errs.deadline = 'Set a deadline';
    if (!form.description.trim()) errs.description = 'Add a brief description';
    return errs;
  };

  /* ── Submit ── */
  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setDbError(null); setLoading(true);

    try {
      await api.create('requests', {
        user_id:       user?.id,
        title:         form.title.trim(),
        amount:        Number(form.amount),
        category:      form.category,
        deadline:      form.deadline,
        description:   form.description.trim(),
        product_link:  form.productLink,
        product_image: form.productImage,
        raw_offers:    form.rawOffers,
        merchant:      form.merchant,
        is_public:     form.isPublic,
        required_card: form.requiredCard || 'Any',
        status: 'pending',
        best_card_info: form.bestCardInfo ? {
          card_name:       form.bestCardInfo.card_name,
          bank:            form.bestCardInfo.bank,
          discount_amount: form.bestCardInfo.discount_amount,
          final_price:     form.bestCardInfo.final_price,
        } : null,
      });

      setSuccess(true);
      setForm(INITIAL);
      setManualMode(false);
      setCrawlerFilled(false);
      if (onCreated) onCreated();
    } catch {
      setDbError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = field => `input-dark${errors[field] ? ' error' : ''}`;
  const today = new Date().toISOString().split('T')[0];

  /* ── Success screen ── */
  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto py-20 text-center space-y-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto stat-success"
          style={{ boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
          <CheckCircle2 size={40} style={{ color: '#10b981' }} />
        </motion.div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Request Submitted!</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Your request is now live. Cardholders with matching offers will reach out to you.
        </p>
        <motion.button id="new-request-again" onClick={() => setSuccess(false)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="btn-primary mx-auto px-8 py-3">
          Submit Another Request
        </motion.button>
      </motion.div>
    );
  }

  /* ── Main form ── */
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>New Purchase Request</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {manualMode
            ? 'Enter your product details manually to create a request for any store.'
            : "Paste a product link — we'll auto-fill details and find the best card discount."}
        </p>
      </div>

      {/* Extension banner */}
      <AnimatePresence>
        {fromExtension && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-xl px-4 py-3 text-sm flex items-center gap-2"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            <span><strong>Loaded from Chrome Extension</strong> — price &amp; card offer pre-filled. Review and submit.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DB error */}
      <AnimatePresence>
        {dbError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            {dbError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ══════════════════════════════════════════
            STEP 1 — Auto-fill via URL  /  Manual banner
        ══════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {!manualMode ? (
            <motion.div
              key="autofill-step1"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl p-4"
              style={{ background: 'var(--surface2)', border: '2px solid rgba(139,92,246,0.3)' }}>

              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text)' }}>
                📌 Step 1: Paste Product Link
              </p>

              <Field label="Product Link" icon={Globe} error={errors.productLink || fetchError}>
                <div className="flex gap-2">
                  <input
                    id="req-link"
                    type="url"
                    value={form.productLink}
                    onChange={set('productLink')}
                    placeholder="https://amazon.in/... or flipkart.com/... or myntra.com/..."
                    disabled={!!crawlStep && crawlStep !== 'done'}
                    className={`flex-1 ${inputCls('productLink')}`}
                  />
                  <motion.button
                    type="button"
                    id="req-autofill"
                    onClick={handleFetchProduct}
                    disabled={(!!crawlStep && crawlStep !== 'done') || !form.productLink.trim()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition whitespace-nowrap"
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      opacity: (!!crawlStep && crawlStep !== 'done') || !form.productLink.trim() ? 0.5 : 1,
                      cursor: (!!crawlStep && crawlStep !== 'done') || !form.productLink.trim() ? 'not-allowed' : 'pointer',
                    }}>
                    {(crawlStep && crawlStep !== 'done')
                      ? <><Loader size={15} className="animate-spin" /> Fetching…</>
                      : <><Zap size={15} /> Auto-fill</>}
                  </motion.button>
                </div>
              </Field>

              {/* Crawl status stepper */}
              <AnimatePresence>
                {crawlStep && (
                  <motion.div className="mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <CrawlStatus step={crawlStep} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fetch error with retry */}
              <AnimatePresence>
                {fetchError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                    <span className="flex-1">{fetchError}</span>
                    <button type="button" onClick={handleFetchProduct}
                      className="flex items-center gap-1 font-semibold flex-shrink-0 hover:opacity-80"
                      style={{ color: '#ef4444' }}>
                      <RefreshCw size={11} /> Retry
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Manual mode trigger */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  Supports Amazon, Flipkart &amp; Myntra
                </span>
                <button
                  type="button"
                  id="req-manual-toggle"
                  onClick={enterManualMode}
                  className="text-xs flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--text-dim)' }}>
                  <Edit3 size={11} />
                  Fill manually instead
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── Manual mode active banner ── */
            <motion.div
              key="manual-step1-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px dashed rgba(139,92,246,0.4)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--primary)' }}>
                <Edit3 size={13} />
                <span className="font-semibold">Manual Entry Mode</span>
                <span style={{ color: 'var(--text-dim)' }}>— works with any store or offline purchase</span>
              </div>
              <button
                type="button"
                id="req-autofill-toggle"
                onClick={exitManualMode}
                className="text-xs flex items-center gap-1.5 hover:opacity-80 transition-opacity font-medium"
                style={{ color: 'var(--text-dim)' }}>
                <Zap size={11} />
                Switch to Auto-fill
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            STEP 2a — Auto-filled product details (editable)
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {crawlerFilled && !manualMode && (
            <motion.div
              key="step2-crawled"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' }}>

              {/* Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#10b981' }}>
                  <CheckCircle2 size={13} />
                  Step 2: Auto-filled Details
                  <span className="font-normal text-[10px]" style={{ color: 'var(--text-dim)' }}>
                    — edit if needed
                  </span>
                </p>
                <MerchantBadge merchant={form.merchant} />
              </div>

              {/* Editable product card */}
              <div className="px-4 pb-3">
                <div className="flex gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                  {/* Thumbnail */}
                  {form.productImage ? (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <img src={form.productImage} alt={form.title}
                        className="w-full h-full object-contain"
                        onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <ShoppingBag size={24} style={{ color: 'var(--text-dim)' }} />
                    </div>
                  )}

                  {/* Editable fields */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <Field label="Product Name" icon={PenLine} error={errors.title} autoFilled>
                      <input
                        id="req-title-edit"
                        type="text"
                        value={form.title}
                        onChange={set('title')}
                        placeholder="Product name"
                        className={inputCls('title')}
                        style={{ fontSize: '0.8rem' }}
                      />
                    </Field>
                    <Field label="Listed Price (₹)" icon={Tag} error={errors.amount} autoFilled
                      hint="Full MRP before discounts">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                          style={{ color: 'var(--text-muted)' }}>₹</span>
                        <input
                          id="req-amount-edit"
                          type="number"
                          min="1"
                          value={form.amount}
                          onChange={set('amount')}
                          placeholder="0"
                          className={`${inputCls('amount')} pl-7`}
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              </div>

              {/* Best card offer panel */}
              <div className="px-4 pb-4">
                {form.bestCardInfo?.discount_amount > 0 ? (
                  <div className="rounded-xl p-3.5"
                    style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.1) 0%,rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <CreditCard size={18} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(139,92,246,0.2)', color: 'var(--primary)' }}>
                            💳 Best Card Offer
                          </span>
                          {form.bestCardInfo.bank && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              {form.bestCardInfo.bank}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-muted)' }}>
                          {form.bestCardInfo.card_name}
                        </p>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>You save</p>
                            <p className="text-lg font-extrabold" style={{ color: '#10b981' }}>
                              ₹{Number(form.bestCardInfo.discount_amount).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Final price</p>
                            <p className="text-base font-bold" style={{ color: 'var(--text)' }}>
                              ₹{Number(form.bestCardInfo.final_price).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <RawOffersList offers={form.rawOffers} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <CreditCard size={13} style={{ color: 'var(--text-dim)' }} />
                    No card discount detected for this product
                    {form.rawOffers?.length > 0 && (
                      <span style={{ color: 'var(--text-dim)' }}>
                        &nbsp;· {form.rawOffers.length} offer string{form.rawOffers.length !== 1 ? 's' : ''} found
                      </span>
                    )}
                  </div>
                )}
                <ManualCardEntry
                  bank={form.manualCardBank || form.bestCardInfo?.bank || 'Any'}
                  discount={form.manualCardDiscount || form.bestCardInfo?.discount_amount || ''}
                  amount={form.amount}
                  onBankChange={handleManualCardBankChange}
                  onDiscountChange={handleManualCardDiscountChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            STEP 2b — Manual entry panel
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {manualMode && (
            <motion.div
              key="step2-manual"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'var(--surface2)' }}>

              {/* Header */}
              <div className="px-4 pt-4 pb-1">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                  <Edit3 size={13} style={{ color: 'var(--primary)' }} />
                  Step 2: Product Details
                </p>
                <p className="text-[11px] mt-0.5 mb-4" style={{ color: 'var(--text-dim)' }}>
                  Works with any e-commerce site, offline purchase, or custom listing.
                </p>
              </div>

              <div className="px-4 pb-4 space-y-4">

                {/* Product name */}
                <Field label="Product Name" icon={ShoppingBag} error={errors.title}>
                  <input
                    id="req-manual-title"
                    type="text"
                    value={form.title}
                    onChange={set('title')}
                    placeholder="e.g. Samsung Galaxy S24 256GB Phantom Black"
                    className={inputCls('title')}
                  />
                </Field>

                {/* Listed price */}
                <Field label="Listed Price (₹)" icon={Tag} error={errors.amount}
                  hint="Full MRP — before any card discount">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}>₹</span>
                    <input
                      id="req-manual-amount"
                      type="number"
                      min="1"
                      value={form.amount}
                      onChange={set('amount')}
                      placeholder="0"
                      className={`${inputCls('amount')} pl-7`}
                    />
                  </div>
                </Field>

                {/* Category + Offer expiry — 2-col grid */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category" icon={Tag} error={errors.category}>
                    <select id="req-manual-category" value={form.category} onChange={set('category')}
                      className={inputCls('category')}>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <Field label="Offer Expiry Date" icon={Calendar} error={errors.deadline}
                    hint="When does the offer expire?">
                    <input
                      id="req-manual-deadline"
                      type="date"
                      value={form.deadline}
                      onChange={set('deadline')}
                      min={today}
                      className={inputCls('deadline')}
                    />
                  </Field>
                </div>

                {/* Optional product link for reference */}
                <Field label="Product Link (optional)" icon={Globe}>
                  <input
                    id="req-manual-link"
                    type="url"
                    value={form.productLink}
                    onChange={set('productLink')}
                    placeholder="https://any-site.com/product/... (for reference only)"
                    className="input-dark"
                  />
                </Field>

                {/* Manual Card Discount */}
                <ManualCardEntry
                  bank={form.manualCardBank || 'Any'}
                  discount={form.manualCardDiscount || ''}
                  amount={form.amount}
                  onBankChange={handleManualCardBankChange}
                  onDiscountChange={handleManualCardDiscountChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════
            STEP 3 — Description + toggles
        ══════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text)' }}>
            📝 Step 3: Your Details
          </p>
          <div className="space-y-4">

            {/* Category + Deadline shown here ONLY in auto-fill mode
                (manual mode has them in Step 2b instead) */}
            {!manualMode && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" icon={Tag} error={errors.category}>
                  <select id="req-category" value={form.category} onChange={set('category')}
                    className={inputCls('category')}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <Field label="Deadline" icon={Calendar} error={errors.deadline}>
                  <input id="req-deadline" type="date" value={form.deadline} onChange={set('deadline')}
                    min={today} className={inputCls('deadline')} />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Preferred Card Requirement" icon={CreditCard} hint="Which bank card is needed?">
                <select
                  id="req-required-card"
                  value={form.requiredCard}
                  onChange={set('requiredCard')}
                  className={inputCls('requiredCard')}>
                  {BANKS.map(b => (
                    <option key={b} value={b}>
                      {b === 'Any' ? 'Any Bank Card' : b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Description" icon={AlignLeft} error={errors.description}>
                <textarea id="req-description" value={form.description} onChange={set('description')} rows={1}
                  placeholder="Any special requirements? Color, brand preference, urgency..."
                  className={inputCls('description')} style={{ resize: 'none' }} />
              </Field>
            </div>
          </div>
        </div>

        {/* Marketplace toggle */}
        <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <input type="checkbox" checked={form.isPublic} onChange={set('isPublic')}
            className="mt-1 w-4 h-4 rounded" style={{ accentColor: 'var(--primary)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Post to Public Marketplace</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Let cardholders see and offer on your request.
            </p>
          </div>
        </label>

        {/* How it works */}
        <div className="rounded-xl p-4 text-xs" style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <p className="font-semibold mb-2" style={{ color: 'var(--primary)' }}>💡 How it works</p>
          <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--text-muted)' }}>
            <li>Paste product link → We auto-extract price &amp; best card discount</li>
            <li>Add category &amp; deadline → Submit request</li>
            <li>Cardholders see your request + the best card offer available</li>
            <li>They make an offer → Payment held in escrow</li>
            <li>You save, they earn rewards!</li>
          </ol>
        </div>

        <motion.button id="req-submit" type="submit" disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.97 }}
          className="btn-primary w-full justify-center py-3.5 text-base">
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Send size={16} />Submit Request</>}
        </motion.button>
      </form>
    </motion.div>
  );
}
