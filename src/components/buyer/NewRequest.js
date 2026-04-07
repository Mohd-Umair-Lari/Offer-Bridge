"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';
import { Send, CheckCircle2, Calendar, Tag, DollarSign, AlignLeft, Globe, CreditCard } from 'lucide-react';

const CATEGORIES = [
  'Electronics',
  'Fashion & Clothing',
  'Beauty & Skincare',
  'Home & Kitchen',
  'Books & Stationery',
  'Sports & Fitness',
  'Toys & Games',
  'Groceries',
  'Health & Wellness',
  'Footwear',
  'Accessories',
  'Gaming',
  'Mobile & Tablets',
  'Appliances',
  'Other',
];

const BANKS = ['Any', 'HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra'];

const INITIAL = { title: '', amount: '', category: '', deadline: '', description: '', productLink: '', requiredCard: 'Any', isPublic: true };

export default function NewRequest({ onCreated }) {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dbError, setDbError] = useState(null);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Item title is required';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!form.category) errs.category = 'Select a category';
    if (!form.deadline) errs.deadline = 'Set a deadline';
    if (!form.description.trim()) errs.description = 'Add a brief description';
    if (form.productLink && !/^https?:\/\/.+/.test(form.productLink)) errs.productLink = 'Must be a valid URL (http/https)';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setDbError(null);
    setLoading(true);

    try {
      const newRow = {
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
      };

      const { error } = await supabase.from('requests').insert([newRow]);

      if (error) {
        console.error('Supabase insert error:', error);
        setDbError(`Database error: ${error.message}`);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setForm(INITIAL);
      // Refresh parent data after successful insert
      if (onCreated) onCreated();
    } catch (err) {
      setDbError('Unexpected error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-[#1a1a2e]">Request Submitted!</h2>
        <p className="text-sm text-gray-400">
          Your request is now live. Cardholders with matching offers will reach out to you.
        </p>
        <button
          id="new-request-again"
          onClick={() => setSuccess(false)}
          className="mt-4 px-6 py-2.5 bg-[#185FA5] text-white text-sm font-semibold rounded-xl hover:bg-[#145085] transition active:scale-95"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1a2e]">New Purchase Request</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Tell us what you want to buy and we'll find a cardholder with the right offer.
        </p>
      </div>

      {dbError && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {dbError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5"><Tag size={13} className="text-gray-400" /> Item Name</span>
          </label>
          <input
            id="req-title"
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. iPhone 16 Pro 256GB Space Black"
            className={`w-full px-4 py-3 text-sm bg-white border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] ${errors.title ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Product Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5"><Globe size={13} className="text-gray-400" /> Product Link</span>
          </label>
          <input
            id="req-link"
            type="url"
            value={form.productLink}
            onChange={set('productLink')}
            placeholder="https://... (Optional)"
            className={`w-full px-4 py-3 text-sm bg-white border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] ${errors.productLink ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
          />
          {errors.productLink && <p className="text-xs text-red-500 mt-1">{errors.productLink}</p>}
        </div>

        {/* Amount + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">₹ Amount (INR)</span>
            </label>
            <input
              id="req-amount"
              type="number"
              value={form.amount}
              onChange={set('amount')}
              placeholder="0"
              min="1"
              step="0.01"
              className={`w-full px-4 py-3 text-sm bg-white border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] ${errors.amount ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select
              id="req-category"
              value={form.category}
              onChange={set('category')}
              className={`w-full px-4 py-3 text-sm bg-white border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] ${errors.category ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>
        </div>

        {/* Card & Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><CreditCard size={13} className="text-gray-400" /> Card Requirement</span>
            </label>
            <select
              id="req-card"
              value={form.requiredCard}
              onChange={set('requiredCard')}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5]"
            >
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><Calendar size={13} className="text-gray-400" /> Deadline</span>
            </label>
            <input
              id="req-deadline"
              type="date"
              value={form.deadline}
              onChange={set('deadline')}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-3 text-sm bg-white border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] ${errors.deadline ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
            />
            {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <span className="flex items-center gap-1.5"><AlignLeft size={13} className="text-gray-400" /> Description</span>
          </label>
          <textarea
            id="req-description"
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder="Describe the exact item — model, colour, store preference, and any other details that help the cardholder match the right offer."
            className={`w-full px-4 py-3 text-sm bg-white border rounded-xl resize-none transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/20 focus:border-[#185FA5] ${errors.description ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
          />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Marketplace Toggle */}
        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50/50 cursor-pointer hover:border-[#185FA5]/30 transition">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={set('isPublic')}
            className="mt-1 w-4 h-4 text-[#185FA5] rounded border-gray-300 focus:ring-[#185FA5]"
          />
          <div>
            <p className="text-sm font-semibold text-[#1a1a2e]">Post to Public Marketplace</p>
            <p className="text-xs text-gray-500 mt-0.5">Let any provider matching your card preference see this request.</p>
          </div>
        </label>

        {/* Info box */}
        <div className="bg-[#E6F1FB] rounded-xl p-4 text-xs text-[#185FA5]">
          <p className="font-semibold mb-1">How it works</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-500">
            <li>Submit your request — it goes live instantly in the database</li>
            <li>Cardholders with matching offers will respond</li>
            <li>Your payment is held in escrow until confirmed</li>
            <li>Deal done — you saved, they earned rewards!</li>
          </ol>
        </div>

        {/* Submit */}
        <button
          id="req-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#185FA5] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#145085] active:scale-[0.99] transition disabled:opacity-60"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Send size={15} /> Submit to Database</>
          )}
        </button>
      </form>
    </div>
  );
}
