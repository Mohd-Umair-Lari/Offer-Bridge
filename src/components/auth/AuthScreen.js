"use client";
import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useTheme } from '@/lib/themeContext';
import { Wallet, Eye, EyeOff, ShoppingBag, CreditCard, LayoutGrid, ShieldCheck, ArrowRight, Check, Loader2, Moon, Sun } from 'lucide-react';
import { signIn } from 'next-auth/react';

// ── Role definitions ────────────────────────────────────────────────
const ROLES = [
  {
    id:    'customer',
    title: 'Discount Seeker',
    sub:   'Looking for offers',
    desc:  'Find and use exclusive credit card discounts from verified cardholders. Save on every purchase.',
    icon:  <ShoppingBag size={22} />,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-700',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
  },
  {
    id:    'provider',
    title: 'Cardholder',
    sub:   'Monetize offers',
    desc:  'Earn money by sharing your unused credit card discounts and benefits with our community.',
    icon:  <CreditCard size={22} />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-emerald-700',
    border: 'border-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  {
    id:    'customer_provider',
    title: 'Both Roles',
    sub:   'Everything',
    desc:  'Get access to both features — save on purchases AND earn from your unused card benefits.',
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
    desc:  'Manage the CardHub platform, escrow, disputes, and user activity.',
    icon:  <ShieldCheck size={22} />,
    color: 'slate',
    gradient: 'from-slate-600 to-slate-800',
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────
function InputField({ id, label, type = 'text', value, onChange, placeholder, error, suffix, autoComplete }) {
  const [showPw, setShowPw] = useState(false);
  const inputType = type === 'password' ? (showPw ? 'text' : 'password') : type;
  const resolvedAutoComplete = autoComplete ?? (type === 'password' ? 'current-password' : 'on');
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={resolvedAutoComplete}
          className={`w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border rounded-xl transition focus:outline-none focus:ring-2 focus:ring-[#185FA5]/25 focus:border-[#185FA5] dark:text-white ${error ? 'border-red-300 dark:border-red-600 bg-red-50/30 dark:bg-red-950/30' : 'border-gray-200 dark:border-slate-700'} ${suffix ? 'pr-10' : ''}`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Main AuthScreen ──────────────────────────────────────────────────
export default function AuthScreen() {
  const { signIn, signUp } = useAuth();  const { theme, toggleTheme } = useTheme();
  const [mode, setMode]     = useState('login'); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [oauthLoading, setOAuthLoading] = useState(null); // Track which OAuth provider is loading

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

  // ── OAuth Handlers ─────────────────────────────────────────────────
  const handleOAuthSignIn = async (provider) => {
    setOAuthLoading(provider);
    try {
      console.log('[Auth] OAuth sign in with:', provider);
      await signIn(provider, {
        redirect: true,
        callbackUrl: '/role-selection',
      });
    } catch (error) {
      console.error('[Auth] OAuth error:', error);
      setServerError(`Failed to sign in with ${provider}`);
      setOAuthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950 transition-colors">

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
            Go<span className="text-blue-300 font-light">Zivo</span>
          </span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Connect cardholders with<br />
              <span className="text-blue-300">discount seekers</span>
            </h1>
            <p className="text-blue-200/70 mt-4 text-base leading-relaxed">
              Cardholders monetize unused offers. Discount seekers get exclusive deals. Everyone wins.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              'Verified cardholders with exclusive discount offers',
              'Secure escrow — your funds protected until deal completion',
              'Earn real commissions on every successful transaction',
              'Join thousands of cardholders and discount seekers',
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
            { val: 'Verified', label: 'Cardholders' },
            { val: 'Trusted', label: 'Platform' },
            { val: 'Live', label: 'Now' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white">{s.val}</p>
              <p className="text-xs text-blue-300/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Form Panel ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8f9fc] dark:bg-slate-950 transition-colors">
        <div className="w-full max-w-md relative">

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="absolute -top-12 right-0 p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <Moon size={18} className="text-gray-600" />
            ) : (
              <Sun size={18} className="text-yellow-400" />
            )}
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-[#185FA5] rounded-lg flex items-center justify-center">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="font-bold text-[#185FA5] text-xl">
              Go<span className="text-gray-400 font-normal">Zivo</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 transition-colors">

            {/* Mode tabs */}
            <div className="flex gap-2 rounded-full bg-gradient-to-r from-gray-50 dark:from-slate-800 to-gray-100 dark:to-slate-700 p-1.5 mb-8">
              {[['login', 'Sign In'], ['signup', 'Create Account']].map(([m, label]) => (
                <button
                  key={m}
                  id={`auth-tab-${m}`}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-full transition-all duration-300 ${
                    mode === m
                      ? 'bg-white dark:bg-slate-900 shadow-lg shadow-blue-100 dark:shadow-blue-900/30 text-[#185FA5]'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Server messages */}
            {serverError && (
              <div className="mb-5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">
                {serverError}
              </div>
            )}
            {successMsg && (
              <div className="mb-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-xl px-4 py-3">
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
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
                  autoComplete="new-password"
                />
              )}

              {/* Role selection — signup only */}
              {mode === 'signup' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">I am a…</p>
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
                              ? `${r.border} ${r.bg} shadow-sm dark:shadow-lg`
                              : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-700'
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
                          <p className={`text-xs font-bold leading-tight ${isSelected ? r.text : 'text-gray-700 dark:text-gray-300'}`}>
                            {r.title}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{r.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                  {/* Role description */}
                  <div className="mt-3 bg-gray-50 dark:bg-slate-800 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400 min-h-[36px] transition-all">
                    {ROLES.find((r) => r.id === selectedRole)?.desc}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                id="auth-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-[#185FA5] hover:bg-[#145085] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-60"
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('google')}
                disabled={oauthLoading !== null}
                className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleOAuthSignIn('facebook')}
                disabled={oauthLoading !== null}
                className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                {oauthLoading === 'facebook' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleOAuthSignIn('azure-ad')}
                disabled={oauthLoading !== null}
                className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                {oauthLoading === 'azure-ad' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#0078D4" />
                  </svg>
                )}
              </button>
            </div>

            {/* Toggle link */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-5">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[#185FA5] font-semibold hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-4">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
