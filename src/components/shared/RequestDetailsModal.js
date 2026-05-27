"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Tag, CreditCard, Link as LinkIcon, DollarSign, AlignLeft, ShieldCheck, Globe, Edit, Save, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

const STATUS_CLS = {
  pending:   'badge-warning',
  matched:   'badge-info',
  completed: 'badge-success',
};

const CATEGORIES = ['Electronics','Fashion & Clothing','Beauty & Skincare','Home & Kitchen','Books & Stationery','Sports & Fitness','Toys & Games','Groceries','Health & Wellness','Footwear','Accessories','Gaming','Mobile & Tablets','Appliances','Other'];
const BANKS = ['Any', 'HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra'];

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-dim)' }}>
        <Icon size={13} /><p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  );
}

export default function RequestDetailsModal({ req, onClose, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: req?.title || '',
    amount: req?.amount || '',
    category: req?.category || '',
    deadline: req?.deadline ? req.deadline.split('T')[0] : '',
    description: req?.description || '',
    productLink: req?.product_link || '',
    requiredCard: req?.required_card || 'Any',
    isPublic: req?.is_public !== false,
  });

  if (!req) return null;

  const canEdit = req.status === 'pending';

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title required';
    if (!form.amount || isNaN(Number(form.amount)) || +form.amount <= 0) errs.amount = 'Valid amount required';
    if (!form.category) errs.category = 'Category required';
    if (!form.deadline) errs.deadline = 'Deadline required';
    if (!form.description.trim()) errs.description = 'Description required';
    if (form.productLink && !/^https?:\/\/.+/.test(form.productLink)) errs.productLink = 'Invalid URL';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    
    setLoading(true);
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
      setSaveSuccess(true);
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
        if (onUpdated) onUpdated();
      }, 1500);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
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
    setErrors({});
    setIsEditing(false);
  };

  const inputCls = (field) => `px-3 py-2 rounded-lg text-sm w-full transition ${errors[field] ? 'error' : ''}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={onClose} />

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
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {isEditing ? 'Edit Request' : req.title}
              </h2>
              {!isEditing && (
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge ${STATUS_CLS[req.status] || 'badge-neutral'} uppercase tracking-wider text-[10px]`}>{req.status}</span>
                  {req.created_at && (
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {new Date(req.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition" style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {saveSuccess ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <CheckCircle2 size={32} style={{ color: '#10b981' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Saved!</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your request has been updated.</p>
              </motion.div>
            ) : isEditing ? (
              <div className="space-y-4">
                {errors.submit && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="rounded-lg px-4 py-3 flex items-start gap-3"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={16} style={{ color: '#ef4444', marginTop: '2px' }} />
                    <p className="text-xs" style={{ color: '#ef4444' }}>{errors.submit}</p>
                  </motion.div>
                )}

                <Field label="Item Title" error={errors.title}>
                  <input type="text" value={form.title} onChange={set('title')} className={inputCls('title')}
                    style={{ background: 'var(--surface2)', border: '1px solid ' + (errors.title ? '#ef4444' : 'var(--border)'), color: 'var(--text)' }} />
                </Field>

                <Field label="Amount (₹)" error={errors.amount}>
                  <input type="number" value={form.amount} onChange={set('amount')} className={inputCls('amount')} min="1" step="0.01"
                    style={{ background: 'var(--surface2)', border: '1px solid ' + (errors.amount ? '#ef4444' : 'var(--border)'), color: 'var(--text)' }} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category" error={errors.category}>
                    <select value={form.category} onChange={set('category')} className={inputCls('category')}
                      style={{ background: 'var(--surface2)', border: '1px solid ' + (errors.category ? '#ef4444' : 'var(--border)'), color: 'var(--text)' }}>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>

                  <Field label="Required Card" error={errors.requiredCard}>
                    <select value={form.requiredCard} onChange={set('requiredCard')} className={inputCls('requiredCard')}
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Deadline" error={errors.deadline}>
                  <input type="date" value={form.deadline} onChange={set('deadline')} className={inputCls('deadline')}
                    style={{ background: 'var(--surface2)', border: '1px solid ' + (errors.deadline ? '#ef4444' : 'var(--border)'), color: 'var(--text)' }} />
                </Field>

                <Field label="Description" error={errors.description}>
                  <textarea value={form.description} onChange={set('description')} rows={4} className={inputCls('description')}
                    style={{ background: 'var(--surface2)', border: '1px solid ' + (errors.description ? '#ef4444' : 'var(--border)'), color: 'var(--text)', resize: 'none' }} />
                </Field>

                <Field label="Product Link (Optional)" error={errors.productLink}>
                  <input type="url" value={form.productLink} onChange={set('productLink')} placeholder="https://example.com" className={inputCls('productLink')}
                    style={{ background: 'var(--surface2)', border: '1px solid ' + (errors.productLink ? '#ef4444' : 'var(--border)'), color: 'var(--text)' }} />
                </Field>

                <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <input type="checkbox" checked={form.isPublic} onChange={set('isPublic')}
                    className="w-4 h-4 rounded" style={{ accentColor: 'var(--primary)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Post to Public Marketplace</span>
                </label>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Amount hero */}
                <div className="rounded-2xl p-5 flex items-center justify-between text-white"
                  style={{ background: 'linear-gradient(135deg, #0d0d1e 0%, #1a0a2e 50%, #2d1060 100%)', border: '1px solid rgba(139,92,246,0.2)', boxShadow: '0 4px 24px rgba(139,92,246,0.2)' }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Budget Amount</p>
                    <p className="text-3xl font-bold tabular-nums mt-0.5">₹{req.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                    <DollarSign size={22} style={{ color: '#a78bfa' }} />
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoTile icon={Tag}        label="Category"      value={req.category} />
                  <InfoTile icon={Calendar}   label="Deadline"      value={req.deadline ? new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'} />
                  <InfoTile icon={CreditCard} label="Required Card" value={req.required_card || 'Any'} />
                  <InfoTile icon={req.is_public ? Globe : ShieldCheck} label="Visibility" value={req.is_public ? 'Marketplace' : 'Private Direct'} />
                </div>

                {/* Description */}
                {req.description && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      <AlignLeft size={15} style={{ color: 'var(--text-dim)' }} />Description
                    </div>
                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap rounded-xl p-4"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {req.description}
                    </p>
                  </div>
                )}

                {/* Product link */}
                {req.product_link && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      <LinkIcon size={15} style={{ color: 'var(--text-dim)' }} />Product Link
                    </div>
                    <a href={req.product_link} target="_blank" rel="noopener noreferrer"
                      className="text-sm block truncate rounded-xl p-3 transition"
                      style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)', color: 'var(--primary)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-dim)'}>
                      {req.product_link}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
            {isEditing ? (
              <>
                <motion.button onClick={handleCancel} disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: 'var(--surface3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <RotateCcw size={14} className="inline mr-1" /> Cancel
                </motion.button>
                <motion.button onClick={handleSave} disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition text-white"
                  style={{ background: loading ? 'rgba(139,92,246,0.5)' : 'var(--primary)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : <><Save size={14} className="inline mr-1" /> Save Changes</>}
                </motion.button>
              </>
            ) : (
              <>
                <motion.button onClick={onClose} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{ background: 'var(--surface3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  Close
                </motion.button>
                {canEdit && (
                  <motion.button onClick={() => setIsEditing(true)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition text-white"
                    style={{ background: 'var(--primary)', border: '1px solid rgba(139,92,246,0.3)' }}>
                    <Edit size={14} className="inline mr-1" /> Edit Request
                  </motion.button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
