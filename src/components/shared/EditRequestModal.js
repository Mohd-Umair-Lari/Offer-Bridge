"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Tag, AlignLeft, Globe, CreditCard, Save, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORIES = ['Electronics','Fashion & Clothing','Beauty & Skincare','Home & Kitchen','Books & Stationery','Sports & Fitness','Toys & Games','Groceries','Health & Wellness','Footwear','Accessories','Gaming','Mobile & Tablets','Appliances','Other'];
const BANKS = ['Any', 'HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra'];

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

export default function EditRequestModal({ req, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: '',
    deadline: '',
    description: '',
    productLink: '',
    requiredCard: 'Any',
    isPublic: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with request data
  useEffect(() => {
    if (req) {
      setForm({
        title: req.title || '',
        amount: req.amount || '',
        category: req.category || '',
        deadline: req.deadline ? req.deadline.split('T')[0] : '',
        description: req.description || '',
        productLink: req.product_link || '',
        requiredCard: req.required_card || 'Any',
        isPublic: req.is_public !== false,
      });
    }
  }, [req]);

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
      await api.update('requests', req.id || req._id, {
        title: form.title.trim(),
        amount: Number(form.amount),
        category: form.category,
        deadline: form.deadline,
        description: form.description.trim(),
        product_link: form.productLink,
        required_card: form.requiredCard,
        is_public: form.isPublic,
      });
      setSuccess(true);
      setTimeout(() => {
        if (onUpdated) onUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setDbError(err.message || 'Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) => `input-dark${errors[field] ? ' error' : ''}`;

  if (!req) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => !loading && onClose()} />

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-lg flex flex-col max-h-[90vh] rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}>

          {/* Header */}
          <div className="px-6 py-5 flex items-start justify-between" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Edit Request</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Update your purchase request details</p>
            </div>
            <button onClick={() => !loading && onClose()} className="p-1.5 rounded-lg transition" style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <Save size={32} style={{ color: '#10b981' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Request Updated!</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your request has been saved with the new details.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence>
                  {dbError && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                      {dbError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field label="Item Name" icon={Tag} error={errors.title}>
                  <input id="edit-req-title" type="text" value={form.title} onChange={set('title')}
                    placeholder="e.g. iPhone 16 Pro 256GB Space Black" className={inputCls('title')} />
                </Field>

                <Field label="Product Link" icon={Globe} error={errors.productLink}>
                  <input id="edit-req-link" type="url" value={form.productLink} onChange={set('productLink')}
                    placeholder="https://… (Optional)" className={inputCls('productLink')} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="₹ Amount (INR)" error={errors.amount}>
                    <input id="edit-req-amount" type="number" value={form.amount} onChange={set('amount')}
                      placeholder="0" min="1" step="0.01" className={inputCls('amount')} />
                  </Field>
                  <Field label="Category" error={errors.category}>
                    <select id="edit-req-category" value={form.category} onChange={set('category')} className={inputCls('category')}>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Card Requirement" icon={CreditCard}>
                    <select id="edit-req-card" value={form.requiredCard} onChange={set('requiredCard')} className="input-dark">
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Deadline" icon={Calendar} error={errors.deadline}>
                    <input id="edit-req-deadline" type="date" value={form.deadline} onChange={set('deadline')}
                      className={inputCls('deadline')} />
                  </Field>
                </div>

                <Field label="Description" icon={AlignLeft} error={errors.description}>
                  <textarea id="edit-req-description" value={form.description} onChange={set('description')} rows={4}
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
              </form>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <button onClick={() => !loading && onClose()} disabled={loading}
                className="btn-secondary flex-1 py-2.5 text-sm">
                Cancel
              </button>
              <motion.button id="edit-req-save" type="submit" form="edit-req-form" disabled={loading} onClick={handleSubmit}
                whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.97 }}
                className="btn-primary flex-1 py-2.5 text-sm justify-center">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Save size={14} /> Save Changes</>
                )}
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}