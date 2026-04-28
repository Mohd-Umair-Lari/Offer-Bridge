"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { Send, CheckCircle2, Calendar, Tag, AlignLeft, Globe, CreditCard } from 'lucide-react';

const CATEGORIES = ['Electronics','Fashion & Clothing','Beauty & Skincare','Home & Kitchen','Books & Stationery','Sports & Fitness','Toys & Games','Groceries','Health & Wellness','Footwear','Accessories','Gaming','Mobile & Tablets','Appliances','Other'];
const BANKS = ['Any', 'HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra'];
const INITIAL = { title: '', amount: '', category: '', deadline: '', description: '', productLink: '', requiredCard: 'Any', isPublic: true };

function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
        {Icon && <Icon size={13} style={{ color: 'var(--text-dim)' }} />}
        {label}
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

export default function NewRequest({ onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dbError, setDbError] = useState(null);

  const set = field => e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim())                                    errs.title       = 'Item title is required';
    if (!form.amount || isNaN(Number(form.amount)) || +form.amount <= 0) errs.amount = 'Enter a valid amount';
    if (!form.category)                                        errs.category    = 'Select a category';
    if (!form.deadline)                                        errs.deadline    = 'Set a deadline';
    if (!form.description.trim())                              errs.description = 'Add a brief description';
    if (form.productLink && !/^https?:\/\/.+/.test(form.productLink)) errs.productLink = 'Must be a valid URL';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setDbError(null); setLoading(true);
    try {
      const { error } = await supabase.from('requests').insert([{
        user_id: user?.id,
        title: form.title.trim(),
        amount: Number(form.amount),
        category: form.category,
        deadline: form.deadline,
        description: form.description.trim(),
        product_link: form.productLink,
        required_card: form.requiredCard,
        is_public: form.isPublic,
        status: 'pending',
      }]);
      if (error) { setDbError(`Database error: ${error.message}`); return; }
      setSuccess(true); setForm(INITIAL);
      if (onCreated) onCreated();
    } catch (err) {
      setDbError('Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) => `input-dark${errors[field] ? ' error' : ''}`;

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto py-20 text-center space-y-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}
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

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>New Purchase Request</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Tell us what you want to buy and we'll find a cardholder with the right offer.</p>
      </div>

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
        <Field label="Item Name" icon={Tag} error={errors.title}>
          <input id="req-title" type="text" value={form.title} onChange={set('title')}
            placeholder="e.g. iPhone 16 Pro 256GB Space Black" className={inputCls('title')} />
        </Field>

        <Field label="Product Link" icon={Globe} error={errors.productLink}>
          <input id="req-link" type="url" value={form.productLink} onChange={set('productLink')}
            placeholder="https://… (Optional)" className={inputCls('productLink')} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="₹ Amount (INR)" error={errors.amount}>
            <input id="req-amount" type="number" value={form.amount} onChange={set('amount')}
              placeholder="0" min="1" step="0.01" className={inputCls('amount')} />
          </Field>
          <Field label="Category" error={errors.category}>
            <select id="req-category" value={form.category} onChange={set('category')} className={inputCls('category')}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Card Requirement" icon={CreditCard}>
            <select id="req-card" value={form.requiredCard} onChange={set('requiredCard')} className="input-dark">
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Deadline" icon={Calendar} error={errors.deadline}>
            <input id="req-deadline" type="date" value={form.deadline} onChange={set('deadline')}
              min={new Date().toISOString().split('T')[0]} className={inputCls('deadline')} />
          </Field>
        </div>

        <Field label="Description" icon={AlignLeft} error={errors.description}>
          <textarea id="req-description" value={form.description} onChange={set('description')} rows={4}
            placeholder="Describe the exact item — model, colour, store preference, and any other details…"
            className={inputCls('description')} style={{ resize: 'none' }} />
        </Field>

        {/* Marketplace toggle */}
        <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <input type="checkbox" checked={form.isPublic} onChange={set('isPublic')}
            className="mt-1 w-4 h-4 rounded" style={{ accentColor: 'var(--primary)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Post to Public Marketplace</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Let any provider matching your card preference see this request.</p>
          </div>
        </label>

        {/* Info box */}
        <div className="rounded-xl p-4 text-xs" style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <p className="font-semibold mb-2" style={{ color: 'var(--primary)' }}>How it works</p>
          <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--text-muted)' }}>
            <li>Submit your request — it goes live instantly in the database</li>
            <li>Cardholders with matching offers will respond</li>
            <li>Your payment is held in escrow until confirmed</li>
            <li>Deal done — you saved, they earned rewards!</li>
          </ol>
        </div>

        <motion.button id="req-submit" type="submit" disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.97 }}
          className="btn-primary w-full justify-center py-3.5 text-base">
          {loading
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Send size={16} />Submit to Database</>}
        </motion.button>
      </form>
    </motion.div>
  );
}
