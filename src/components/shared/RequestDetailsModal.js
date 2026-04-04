"use client";
import { X, Calendar, Tag, CreditCard, Link as LinkIcon, DollarSign, AlignLeft, ShieldCheck, Globe } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  matched: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function RequestDetailsModal({ req, onClose }) {
  if (!req) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-[#1a1a2e]/40 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-50 flex items-start justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">{req.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${STATUS_STYLES[req.status] || 'bg-gray-50 text-gray-600'}`}>
                {req.status}
              </span>
              <span className="text-xs text-gray-400 font-medium">{new Date(req.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric'})}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto w-full">
          <div className="space-y-6">
            
            {/* Amount */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#185FA5] rounded-xl p-5 text-white flex items-center justify-between shadow-md">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/60 font-medium">Budget Amount</p>
                <p className="text-3xl font-bold tabular-nums tracking-tight mt-0.5">₹{req.amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center border border-white/10">
                <DollarSign size={24} className="text-white/80" />
              </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <Tag size={14} />
                  <p className="text-xs font-medium">Category</p>
                </div>
                <p className="text-sm font-semibold text-[#1a1a2e]">{req.category}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <Calendar size={14} />
                  <p className="text-xs font-medium">Deadline</p>
                </div>
                <p className="text-sm font-semibold text-[#1a1a2e]">
                  {req.deadline ? new Date(req.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Flexible'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <CreditCard size={14} />
                  <p className="text-xs font-medium">Required Card</p>
                </div>
                <p className="text-sm font-semibold text-[#1a1a2e]">{req.required_card}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  {req.is_public ? <Globe size={14} className="text-[#185FA5]" /> : <ShieldCheck size={14} className="text-amber-500" />}
                  <p className="text-xs font-medium">Visibility</p>
                </div>
                <p className="text-sm font-semibold text-[#1a1a2e]">{req.is_public ? 'Marketplace' : 'Private Direct'}</p>
              </div>
            </div>

            {/* Description */}
            {req.description && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-800 font-semibold mb-2">
                  <AlignLeft size={16} />
                  <h3>Description</h3>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50/50 p-4 rounded-xl border border-gray-100 leading-relaxed break-words whitespace-pre-wrap">
                  {req.description}
                </p>
              </div>
            )}

            {/* Link */}
            {req.product_link && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-800 font-semibold mb-2">
                  <LinkIcon size={16} />
                  <h3>Product Link</h3>
                </div>
                <a 
                  href={req.product_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-[#185FA5] hover:underline bg-blue-50 p-3 rounded-xl border border-blue-100 block truncate"
                >
                  {req.product_link}
                </a>
              </div>
            )}
            
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50 mt-auto">
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition active:scale-[0.98]"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
