"use client";
import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { Wallet, Eye, EyeOff, ShoppingBag, CreditCard, LayoutGrid, ShieldCheck, ArrowRight, Check } from 'lucide-react';

// ── Role definitions ────────────────────────────────────────────────
const ROLES = [
  {
    id:    'customer',
    title: 'Customer',
    sub:   'Buyer only',
    desc:  'Browse and purchase using exclusive card discounts from verified providers.',
    icon:  <ShoppingBag size={22} />,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-700',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  {
    id:    'provider',
    title: 'Provider',
    sub:   'Card provider only',
    desc:  'Share your unused card offers and earn commissions on every successful deal.',
    icon:  <CreditCard size={22} />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-700',
    border: 'border-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  {
    id:    'customer_provider',
    title: 'Customer + Provider',
    sub:   'Both roles',
    desc:  'Buy using others\' offers AND share your own card benefits to earn rewards.',
    icon:  <LayoutGrid size={22} />,
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    border: 'border-purple-400',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
  },
  {
    id:    'admin',
    title: 'Admin',
    sub:   'Platform admin',
    desc:  'Manage the OfferBridge platform, escrow, disputes, and user activity.',
    icon:  <ShieldCheck size={22} />,
    color: 'slate',
    gradient: 'from-slate-600 to-slate-800',
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────
function InputField({ id, label, type = 'text', value, onChange, placeholder, error, suffix }) {
  const [showPw, setShowPw] = useState(false);
  const inputType = type === 'password' ? (showPw ? 'text' : 'password') : type;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={type === 'password' ? 'current-password' : 'on'}
          className={`w-full px-4 py-3 text-sm bg-white border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/25 focus:border-[#185FA5] ${error ? 'border-red-300 bg-red-50/30' : 'border-gray-200'} ${suffix ? 'pr-10' : ''}`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Main AuthScreen ──────────────────────────────────────────────────
export default function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode]     = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  // Form state
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPw: '' });
  const [selectedRole, setSelectedRole] = useState('customer');
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: null }));
    setServerError('');
  };

  // ── Validation ─────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (mode === 'signup' && !form.name.trim())  errs.name     = 'Full name is required';
    if (!form.email.trim())                      errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email))  errs.email    = 'Enter a valid email';
    if (!form.password)                          errs.password = 'Password is required';
    else if (form.password.length < 6)           errs.password = 'Min 6 characters';
    if (mode === 'signup' && form.confirmPw !== form.password) errs.confirmPw = 'Passwords do not match';
    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password);
        if (error) setServerError(error.message);
      } else {
        const { error } = await signUp(form.email, form.password, form.name.trim(), selectedRole);
        if (error) {
          setServerError(error.message);
        } else {
          setSuccessMsg('Account created! Check your email to confirm, or sign in if confirmation is disabled.');
          setMode('login');
          setForm((p) => ({ ...p, password: '', confirmPw: '', name: '' }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setServerError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left Branding Panel ─────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#1a3d70] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#185FA5]/20 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 right-8 w-40 h-40 bg-white/3 rounded-full" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-[#185FA5] rounded-xl flex items-center justify-center shadow-lg">
            <Wallet size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl">
            Offer<span className="text-blue-300 font-light">Bridge</span>
          </span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              The marketplace for<br />
              <span className="text-blue-300">exclusive card benefits</span>
            </h1>
            <p className="text-blue-200/70 mt-4 text-base leading-relaxed">
              Connect buyers with cardholders. Unlock discounts. Earn from your unused offers.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              'Verified cardholders with real offers',
              'Secure escrow — funds protected until delivery',
              'Earn commissions on every successful deal',
              '4 roles: Customer, Provider, Both, Admin',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Check size={11} className="text-emerald-400" />
                </div>
                <p className="text-sm text-blue-100/80">{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { val: '500+', label: 'Active Offers' },
            { val: '$2M+', label: 'Volume Brokered' },
            { val: '99%', label: 'Deal Success' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white">{s.val}</p>
              <p className="text-xs text-blue-300/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Form Panel ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8f9fc]">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-[#185FA5] rounded-lg flex items-center justify-center">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="font-bold text-[#185FA5] text-xl">
              Offer<span className="text-gray-400 font-normal">Bridge</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">

            {/* Mode tabs */}
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-7">
              {[['login', 'Sign In'], ['signup', 'Create Account']].map(([m, label]) => (
                <button
                  key={m}
                  id={`auth-tab-${m}`}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    mode === m
                      ? 'bg-white shadow-sm text-[#185FA5]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Server messages */}
            {serverError && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {serverError}
              </div>
            )}
            {successMsg && (
              <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name — signup only */}
              {mode === 'signup' && (
                <InputField
                  id="auth-name"
                  label="Full Name"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Jane Smith"
                  error={errors.name}
                />
              )}

              <InputField
                id="auth-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                error={errors.email}
              />

              <InputField
                id="auth-password"
                label="Password"
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                error={errors.password}
              />

              {mode === 'signup' && (
                <InputField
                  id="auth-confirm-pw"
                  label="Confirm Password"
                  type="password"
                  value={form.confirmPw}
                  onChange={set('confirmPw')}
                  placeholder="••••••••"
                  error={errors.confirmPw}
                />
              )}

              {/* Role selection — signup only */}
              {mode === 'signup' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">I am a…</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {ROLES.map((r) => {
                      const isSelected = selectedRole === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          id={`role-card-${r.id}`}
                          onClick={() => setSelectedRole(r.id)}
                          className={`relative p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                            isSelected
                              ? `${r.border} ${r.bg} shadow-sm`
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                          }`}
                        >
                          {/* Selected check */}
                          {isSelected && (
                            <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-gradient-to-br ${r.gradient} flex items-center justify-center`}>
                              <Check size={9} className="text-white" />
                            </div>
                          )}
                          <div className={`mb-2 ${isSelected ? r.text : 'text-gray-400'}`}>
                            {r.icon}
                          </div>
                          <p className={`text-xs font-bold leading-tight ${isSelected ? r.text : 'text-gray-700'}`}>
                            {r.title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{r.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                  {/* Role description */}
                  <div className="mt-3 bg-gray-50 rounded-xl p-3 text-xs text-gray-500 min-h-[36px] transition-all">
                    {ROLES.find((r) => r.id === selectedRole)?.desc}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                id="auth-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#185FA5] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#145085] active:scale-[0.99] transition disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Toggle link */}
            <p className="text-center text-xs text-gray-400 mt-5">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[#185FA5] font-semibold hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-4">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
