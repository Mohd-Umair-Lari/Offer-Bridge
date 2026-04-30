"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, CreditCard, LayoutGrid, ShieldCheck, ArrowRight,
  Check, User, Phone, Sparkles, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';

const ROLES = [
  {
    id: 'customer',
    title: 'Buyer',
    sub: 'I want to shop with card discounts',
    icon: ShoppingBag,
    gradFrom: '#3b82f6', gradTo: '#2563eb',
    perks: ['Browse public requests', 'Pay via secure escrow', 'Get matched with cardholders'],
  },
  {
    id: 'provider',
    title: 'Card Provider',
    sub: 'I have card offers to share',
    icon: CreditCard,
    gradFrom: '#10b981', gradTo: '#059669',
    perks: ['List your credit/debit cards', 'Earn 2% commission per deal', '24h delivery commitment'],
  },
  {
    id: 'customer_provider',
    title: 'Both',
    sub: 'I want to buy and earn',
    icon: LayoutGrid,
    gradFrom: '#8b5cf6', gradTo: '#7c3aed',
    perks: ['Full marketplace access', 'Buy & earn simultaneously', 'Best of both worlds'],
  },
];

const STEPS = ['Welcome', 'Choose Role', 'Your Profile', 'All Set'];

// ── Step indicator ────────────────────────────────────────────────
function StepBar({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
              style={{
                background: i < step
                  ? 'linear-gradient(135deg,#10b981,#059669)'
                  : i === step
                    ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)'
                    : 'var(--surface2)',
                color: i <= step ? 'white' : 'var(--text-dim)',
                boxShadow: i === step ? '0 4px 14px rgba(139,92,246,0.4)' : 'none',
              }}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
            <span className="hidden sm:block text-[11px] font-medium"
              style={{ color: i === step ? 'var(--primary)' : 'var(--text-dim)' }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-8 h-px" style={{ background: i < step ? '#10b981' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────
export default function OnboardingWizard() {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep]           = useState(0);
  const [role, setRole]           = useState('customer');
  const [fullName, setFullName]   = useState(user?.fullName || '');
  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const next = () => setStep(s => s + 1);

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    const { error: err } = await completeOnboarding({ role, fullName: fullName.trim(), phone });
    if (err) { setError(err); setLoading(false); return; }
    // authContext will update user.onboarding_complete = true → wizard disappears
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}>

      {/* Background orbs */}
      <div className="absolute w-[500px] h-[500px] -top-32 -left-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute w-[400px] h-[400px] -bottom-20 -right-20 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(6,182,212,0.10) 0%,transparent 70%)', filter: 'blur(60px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-full max-w-lg rounded-3xl p-8 relative"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}>

        <StepBar step={step} />

        <AnimatePresence mode="wait">

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <motion.div key="s0"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.28 }} className="text-center space-y-6">

              <motion.div
                animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
                className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', boxShadow: '0 16px 40px rgba(139,92,246,0.4)' }}>
                <Sparkles size={32} className="text-white" />
              </motion.div>

              <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
                  Welcome to <span className="gradient-text">OfferBridge</span>!
                </h1>
                <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Hey <strong style={{ color: 'var(--primary)' }}>{user?.fullName?.split(' ')[0] || 'there'}</strong> 👋 — let's get you set up in under a minute.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { v: '₹2Cr+', l: 'Volume Brokered' },
                  { v: '500+', l: 'Active Offers' },
                  { v: '99%',  l: 'Deal Success' },
                ].map(s => (
                  <div key={s.l} className="rounded-2xl p-3"
                    style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <p className="text-xl font-bold gradient-text">{s.v}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{s.l}</p>
                  </div>
                ))}
              </div>

              <motion.button onClick={next}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="btn-primary w-full justify-center py-3.5 text-base">
                Let's get started <ArrowRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 1: Role ── */}
          {step === 1 && (
            <motion.div key="s1"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.28 }} className="space-y-5">

              <div className="text-center">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>How will you use OfferBridge?</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Choose your role — you can update this later</p>
              </div>

              <div className="space-y-3">
                {ROLES.map(r => {
                  const Icon = r.icon;
                  const selected = role === r.id;
                  return (
                    <motion.button key={r.id}
                      onClick={() => setRole(r.id)}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      className="w-full rounded-2xl p-4 text-left transition-all relative overflow-hidden"
                      style={{
                        background: selected ? `linear-gradient(135deg,${r.gradFrom}12,${r.gradFrom}06)` : 'var(--surface2)',
                        border: `2px solid ${selected ? r.gradFrom + '60' : 'var(--border)'}`,
                        boxShadow: selected ? `0 6px 24px ${r.gradFrom}20` : 'none',
                      }}>

                      {selected && (
                        <motion.div layoutId="role-highlight"
                          className="absolute inset-0 rounded-2xl"
                          style={{ background: `linear-gradient(135deg,${r.gradFrom}08,transparent)` }} />
                      )}

                      <div className="relative flex items-start gap-4">
                        <div className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center"
                          style={{
                            background: selected ? `linear-gradient(135deg,${r.gradFrom},${r.gradTo})` : 'var(--surface3)',
                            boxShadow: selected ? `0 4px 14px ${r.gradFrom}40` : 'none',
                          }}>
                          <Icon size={20} className={selected ? 'text-white' : ''} style={{ color: selected ? 'white' : 'var(--text-dim)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold" style={{ color: selected ? r.gradFrom : 'var(--text)' }}>{r.title}</p>
                            {selected && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg,${r.gradFrom},${r.gradTo})` }}>
                                <Check size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.sub}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {r.perks.map(p => (
                              <span key={p} className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: `${r.gradFrom}14`, color: r.gradFrom, border: `1px solid ${r.gradFrom}25` }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button onClick={next}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="btn-primary w-full justify-center py-3">
                Continue <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 2: Profile ── */}
          {step === 2 && (
            <motion.div key="s2"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.28 }} className="space-y-5">

              <div className="text-center">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Complete your profile</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Help others recognise you on the platform</p>
              </div>

              {/* Avatar preview */}
              {user?.avatar && (
                <div className="flex justify-center">
                  <div className="relative">
                    <img src={user.avatar} alt="avatar"
                      className="w-20 h-20 rounded-full object-cover"
                      style={{ border: '3px solid var(--primary)', boxShadow: '0 0 20px var(--primary-glow)' }} />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: '2px solid var(--surface)' }}>
                      <Check size={11} className="text-white" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                    <input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Jane Smith"
                      className="input-dark pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Phone Number <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="input-dark pl-9"
                    />
                  </div>
                </div>

                <div className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-dim)' }}>
                    <Check size={12} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                      Role: <span style={{ color: 'var(--primary)' }}>
                        {ROLES.find(r => r.id === role)?.title}
                      </span>
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs rounded-xl px-4 py-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  {error}
                </p>
              )}

              <motion.button onClick={handleFinish} disabled={loading || !fullName.trim()}
                whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
                className="btn-primary w-full justify-center py-3">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Sparkles size={16} /> Complete Setup</>
                )}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Skip link (only on role/profile steps) */}
        {step > 0 && step < 3 && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => step === 1 ? next() : handleFinish()}
            className="w-full text-center text-xs mt-4 transition"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-muted)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            Skip for now →
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
