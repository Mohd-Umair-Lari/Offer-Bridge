"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import {
  Send, CheckCircle2, Calendar, Tag, AlignLeft,
  Globe, Zap, Loader, ChevronDown, ChevronUp,
  ShoppingBag, CreditCard, AlertCircle, RefreshCw,
} from 'lucide-react';

const CATEGORIES = [
  'Electronics', 'Fashion & Clothing', 'Beauty & Skincare',
  'Home & Kitchen', 'Books & Stationery', 'Sports & Fitness',
  'Toys & Games', 'Groceries', 'Health & Wellness', 'Footwear',
  'Accessories', 'Gaming', 'Mobile & Tablets', 'Appliances', 'Other',
];

const INITIAL = {
  productLink:  '',
  title:        '',
  amount:       '',
  category:     '',
  deadline:     '',
  description:  '',
  bestCardInfo: null,   // { bank, discount_amount, final_price, card_name }
  productImage: '',
  rawOffers:    [],
  merchant:     '',
  isPublic:     true,
};

/* ─── tiny helpers ─── */
function Field({ label, icon: Icon, error, children, autoFilled = false }) {
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
  
  let bg = 'rgba(124,58,237,0.15)';
  let color = '#7c3aed';
  let border = 'rgba(124,58,237,0.3)';
  let label = '🔗 Merchant';

  if (isAmz) {
    bg = 'rgba(255,153,0,0.15)';
    color = '#ff9900';
    border = 'rgba(255,153,0,0.3)';
    label = '🛒 Amazon';
  } else if (isFlip) {
    bg = 'rgba(40,166,228,0.15)';
    color = '#28a6e4';
    border = 'rgba(40,166,228,0.3)';
    label = '🔵 Flipkart';
  } else if (isMyntra) {
    bg = 'rgba(255,63,108,0.15)';
    color = '#ff3f6c';
    border = 'rgba(255,63,108,0.3)';
    label = '🛍️ Myntra';
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: bg,
        color: color,
        border: `1px solid ${border}`,
      }}>
      {label}
    </span>
  );
}

/* Crawl status stepper */
const STEPS = [
  { key: 'fetch',   label: 'Fetching product page…' },
  { key: 'parse',   label: 'Extracting product details…' },
  { key: 'offers',  label: 'Analysing bank & card offers…' },
  { key: 'done',    label: 'Done!' },
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

/* ─── Main component ─── */
export default function NewRequest({ onCreated }) {
  const { user } = useAuth();
  const [form, setForm]                   = useState(INITIAL);
  const [errors, setErrors]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [crawlStep, setCrawlStep]         = useState(null);   // 'fetch' | 'parse' | 'offers' | 'done' | null
  const [fetchError, setFetchError]       = useState(null);
  const [success, setSuccess]             = useState(false);
  const [dbError, setDbError]             = useState(null);
  const [fromExtension, setFromExtension] = useState(false);
  const stepTimerRef                      = useRef(null);

  /* Load from Chrome extension draft */
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const draftId = params.get('draftId');
    if (!draftId) return;

    fetch(`/api/extension/draft?id=${draftId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) return;
        setForm(prev => ({
          ...prev,
          productLink:  data.productUrl || '',
          title:        data.title || '',
          amount:       data.price ? data.price.toString() : '',
          bestCardInfo: data.bestOffer?.discountAmount > 0 ? {
            bank:            data.bestOffer.bestOfferBank,
            discount_amount: data.bestOffer.discountAmount,
            final_price:     data.bestOffer.finalPriceAfterDiscount,
            card_name:       data.bestOffer.offerDescription,
          } : null,
        }));
        setFromExtension(true);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(() => {});
  }, []);

  const set = field => e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  /* Simulate step progression so user sees meaningful progress */
  function startStepTimer() {
    let idx = 0;
    const sequence = ['fetch', 'parse', 'offers'];
    setCrawlStep(sequence[0]);
    stepTimerRef.current = setInterval(() => {
      idx++;
      if (idx < sequence.length) {
        setCrawlStep(sequence[idx]);
      } else {
        clearInterval(stepTimerRef.current);
      }
    }, 1800);
  }

  function clearStepTimer() {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }

  /* ── Auto-fill handler ── */
  const handleFetchProduct = async () => {
    if (!form.productLink.trim()) {
      setFetchError('Please enter a product URL');
      return;
    }
    if (!/^https?:\/\/.+/.test(form.productLink)) {
      setFetchError('Must be a valid URL starting with https://');
      return;
    }

    setFetchError(null);
    setForm(prev => ({ ...prev, title: '', amount: '', bestCardInfo: null, productImage: '', rawOffers: [], merchant: '' }));
    startStepTimer();

    try {
      const res = await fetch('/api/crawler/extract-product', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productUrl: form.productLink }),
      });

      clearStepTimer();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Extraction failed');

      /* Crawler response shape:
         { success, product: { title, price, image, asin }, best_card: { bank, discount_amount, final_price, card_name }, raw_offers, merchant } */
      const { product, best_card, raw_offers, merchant } = data;

      setCrawlStep('done');
      setTimeout(() => setCrawlStep(null), 2200);

      setForm(prev => ({
        ...prev,
        title:        product.title   || '',
        amount:       product.price   ? product.price.toString() : '',
        productImage: product.image   || '',
        merchant:     merchant        || '',
        rawOffers:    raw_offers      || [],
        bestCardInfo: best_card?.discount_amount > 0 ? {
          bank:            best_card.bank            || '',
          discount_amount: best_card.discount_amount || 0,
          final_price:     best_card.final_price     || (product.price - best_card.discount_amount),
          card_name:       best_card.card_name       || '',
        } : null,
      }));

      setFetchError(null);
    } catch (err) {
      clearStepTimer();
      setCrawlStep(null);
      const msg = err.message || 'Could not fetch product. Try again.';
      // Friendly message for known block scenarios
      if (msg.toLowerCase().includes('blocking') || msg.toLowerCase().includes('bot') || msg.includes('503')) {
        let site = 'The site';
        if (msg.toLowerCase().includes('amazon')) site = 'Amazon';
        else if (msg.toLowerCase().includes('flipkart')) site = 'Flipkart';
        else if (msg.toLowerCase().includes('myntra')) site = 'Myntra';
        setFetchError(`${site} is blocking automated access from this server. Try using the Chrome Extension instead.`);
      } else {
        setFetchError(msg);
      }
    }
  };

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    if (!form.title.trim())                                          errs.title       = 'Product name is required';
    if (!form.amount || isNaN(Number(form.amount)) || +form.amount <= 0) errs.amount = 'Enter a valid amount';
    if (!form.category)                                              errs.category    = 'Select a category';
    if (!form.deadline)                                              errs.deadline    = 'Set a deadline';
    if (!form.description.trim())                                    errs.description = 'Add a brief description';
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
        status:        'pending',
        /* Properly mapped card discount (₹ rupees) */
        best_card_info: form.bestCardInfo ? {
          card_name:       form.bestCardInfo.card_name,
          bank:            form.bestCardInfo.bank,
          discount_amount: form.bestCardInfo.discount_amount,
          final_price:     form.bestCardInfo.final_price,
        } : null,
      });

      setSuccess(true);
      setForm(INITIAL);
      if (onCreated) onCreated();
    } catch {
      setDbError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = field => `input-dark${errors[field] ? ' error' : ''}`;

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>New Purchase Request</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Paste a product link — we'll auto-fill details and find the best card discount.
        </p>
      </div>

      {/* Extension banner */}
      <AnimatePresence>
        {fromExtension && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-xl px-4 py-3 text-sm flex items-center gap-2"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
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
        {/* ── STEP 1: Product Link ── */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '2px solid rgba(139,92,246,0.3)' }}>
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
                placeholder="https://amazon.in/laptop... or https://flipkart.com/... or https://myntra.com/..."
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
                  cursor:  (!!crawlStep && crawlStep !== 'done') || !form.productLink.trim() ? 'not-allowed' : 'pointer',
                }}>
                {(crawlStep && crawlStep !== 'done')
                  ? <><Loader size={15} className="animate-spin" /> Fetching…</>
                  : <><Zap size={15} /> Auto-fill</>}
              </motion.button>
            </div>
          </Field>

          {/* Live crawl status stepper */}
          <AnimatePresence>
            {crawlStep && (
              <motion.div className="mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CrawlStatus step={crawlStep} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fetch error with retry hint */}
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
        </div>

        {/* ── STEP 2: Auto-filled Product Details ── */}
        <AnimatePresence>
          {form.title && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.05)' }}>

              {/* Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#10b981' }}>
                  <CheckCircle2 size={13} />
                  Step 2: Auto-filled Details
                </p>
                <MerchantBadge merchant={form.merchant} />
              </div>

              {/* Product card — image + title + price */}
              <div className="px-4 pb-3">
                <div className="flex gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                  {/* Thumbnail */}
                  {form.productImage ? (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <img
                        src={form.productImage}
                        alt={form.title}
                        className="w-full h-full object-contain"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <ShoppingBag size={24} style={{ color: 'var(--text-dim)' }} />
                    </div>
                  )}

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-2 mb-2"
                      style={{ color: 'var(--text)' }}>
                      {form.title}
                    </p>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <div>
                        <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Detected price</p>
                        <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                          ₹{Number(form.amount).toLocaleString('en-IN')}
                        </p>
                      </div>
                      {form.bestCardInfo?.discount_amount > 0 && (
                        <div>
                          <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>After card discount</p>
                          <p className="text-xl font-bold" style={{ color: '#10b981' }}>
                            ₹{Number(form.bestCardInfo.final_price).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Discount section */}
              <div className="px-4 pb-4">
                {form.bestCardInfo?.discount_amount > 0 ? (
                  <div className="rounded-xl p-3.5"
                    style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(139,92,246,0.25)' }}>
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
                    {/* All raw offers collapsible */}
                    <RawOffersList offers={form.rawOffers} />
                  </div>
                ) : (
                  /* No discount found state */
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <CreditCard size={13} style={{ color: 'var(--text-dim)' }} />
                    No card discount detected for this product
                    {form.rawOffers?.length > 0 && (
                      <span style={{ color: 'var(--text-dim)' }}>
                        &nbsp;· {form.rawOffers.length} offer string{form.rawOffers.length !== 1 ? 's' : ''} found (none matched known banks)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 3: Manual user inputs ── */}
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text)' }}>📝 Step 3: Your Details</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" icon={Tag} error={errors.category}>
                <select id="req-category" value={form.category} onChange={set('category')} className={inputCls('category')}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Deadline" icon={Calendar} error={errors.deadline}>
                <input id="req-deadline" type="date" value={form.deadline} onChange={set('deadline')}
                  min={new Date().toISOString().split('T')[0]} className={inputCls('deadline')} />
              </Field>
            </div>

            <Field label="Description" icon={AlignLeft} error={errors.description}>
              <textarea id="req-description" value={form.description} onChange={set('description')} rows={3}
                placeholder="Any special requirements? Color, brand preference, urgency..."
                className={inputCls('description')} style={{ resize: 'none' }} />
            </Field>
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

        {/* Info box */}
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
