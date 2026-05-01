"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/authContext';
import { Wallet, Eye, EyeOff, ArrowRight, ArrowLeft, Check } from 'lucide-react';


// ── Floating Orb ─────────────────────────────────────────────────
function Orb({ size, x, y, delay, color, blur, animClass }) {
  return (
    <div
      className={`absolute rounded-full ${animClass} animate-glow`}
      style={{
        width: size, height: size,
        left: x, top: y,
        background: `radial-gradient(circle, ${color}60 0%, ${color}10 70%, transparent 100%)`,
        filter: `blur(${blur}px)`,
        animationDelay: `${delay}s`,
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Input Field ───────────────────────────────────────────────────
function InputField({ id, label, type = 'text', value, onChange, placeholder, error, autoComplete }) {
  const [showPw, setShowPw] = useState(false);
  const inputType = type === 'password' ? (showPw ? 'text' : 'password') : type;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <label htmlFor={id} className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete ?? (type === 'password' ? 'current-password' : 'on')}
          className={`input-dark ${error ? 'error' : ''} ${type === 'password' ? 'pr-11' : ''}`}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition"
            style={{ color: 'var(--text-dim)' }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Social Button ────────────────────────────────────────────────
function SocialButton({ label, icon, onClick, provider }) {
  return (
    <motion.button
      type="button"
      id={`oauth-${provider}`}
      onClick={onClick}
      whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.97 }}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-sm font-semibold transition-all"
      style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--surface3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)'; }}
    >
      {icon}
      {label}
    </motion.button>
  );
}

// ── Main Auth Screen ──────────────────────────────────────────────
export default function AuthScreen({ onBack }) {
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const set = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: null }));
    setServerError('');
  };

  const validate = () => {
    const errs = {};
    if (mode === 'signup' && !form.name.trim()) errs.name     = 'Full name is required';
    if (!form.email.trim())                     errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email    = 'Enter a valid email';
    if (!form.password)                         errs.password = 'Password is required';
    else if (form.password.length < 6)          errs.password = 'Min 6 characters';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setServerError(''); setSuccessMsg('');
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password);
        if (error) setServerError(error.message);
      } else {
        // signUp sets onboarding_complete=false → OnboardingWizard will open automatically
        const { error } = await signUp(form.email, form.password, form.name.trim());
        if (error) setServerError(error.message);
        // On success: authContext sets user → needsOnboarding=true → wizard shown
      }
    } finally { setLoading(false); }
  };

  const switchMode = m => { setMode(m); setErrors({}); setServerError(''); setSuccessMsg(''); };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Left Branding Panel ──────────────────────────────── */}
      <div className="hidden lg:flex w-[46%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #09090f 0%, #0f0f1e 50%, #130d22 100%)', borderRight: '1px solid var(--border)' }}>

        {/* Animated orbs */}
        <Orb size="320px" x="-80px"  y="-60px"   delay={0}   color="#8b5cf6" blur={80}  animClass="animate-float1" />
        <Orb size="240px" x="60%"    y="15%"      delay={2}   color="#7c3aed" blur={60}  animClass="animate-float2" />
        <Orb size="180px" x="-20px"  y="55%"      delay={1}   color="#a855f7" blur={50}  animClass="animate-float1" />
        <Orb size="280px" x="55%"    y="65%"      delay={3}   color="#6d28d9" blur={70}  animClass="animate-float2" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative flex items-center gap-3 z-10">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', boxShadow: '0 0 30px rgba(139,92,246,0.5)' }}>
            <Wallet size={20} className="text-white" />
          </div>
          <span className="font-bold text-2xl">
            <span className="gradient-text">Go</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>Zivo</span>
          </span>
        </motion.div>

        {/* Hero content */}
        <motion.div className="relative z-10 space-y-8"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}>
          <div>
            <h1 className="text-4xl font-bold leading-tight" style={{ color: 'var(--text)' }}>
              The marketplace for<br />
              <span className="gradient-text">exclusive card benefits</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Connect buyers with cardholders. Unlock discounts. Earn from your unused offers.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {[
              'Verified cardholders with real offers',
              'Secure escrow — funds protected until delivery',
              'Earn commissions on every successful deal',
              '4 roles: Customer, Provider, Both, Admin',
            ].map((f, i) => (
              <motion.div key={f} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <Check size={10} style={{ color: 'var(--primary)' }} />
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{f}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div className="relative z-10 grid grid-cols-3 gap-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          {[
            { val: '500+', label: 'Active Offers' },
            { val: '$2M+', label: 'Volume Brokered' },
            { val: '99%',  label: 'Deal Success' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-2xl"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <p className="text-2xl font-bold gradient-text">{s.val}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Right Form Panel ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 0 20px var(--primary-glow)' }}>
              <Wallet size={17} className="text-white" />
            </div>
            <span className="font-bold text-xl"><span className="gradient-text">Go</span><span style={{ color: 'var(--text)' }}>Zivo</span></span>
          </motion.div>

          {/* Back to landing */}
          {onBack && (
            <motion.button onClick={onBack} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-sm font-medium mb-5 transition"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <ArrowLeft size={14} /> Back to home
            </motion.button>
          )}

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="rounded-3xl p-8"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.05)' }}>

            {/* Mode tabs */}
            <div className="flex rounded-xl p-1 mb-7 gap-1" style={{ background: 'var(--surface2)' }}>
              {[['login', 'Sign In'], ['signup', 'Create Account']].map(([m, lbl]) => (
                <button key={m} id={`auth-tab-${m}`} onClick={() => switchMode(m)}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 relative">
                  {mode === m && (
                    <motion.div layoutId="auth-tab-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: 'var(--primary)', boxShadow: '0 2px 12px var(--primary-glow)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10" style={{ color: mode === m ? 'white' : 'var(--text-muted)' }}>{lbl}</span>
                </button>
              ))}
            </div>

            {/* Server messages */}
            <AnimatePresence>
              {serverError && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-5 rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  {serverError}
                </motion.div>
              )}
              {successMsg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-5 rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.form key={mode} onSubmit={handleSubmit}
                initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4">

                {mode === 'signup' && (
                  <InputField id="auth-name" label="Full Name" value={form.name} onChange={set('name')} placeholder="Jane Smith" error={errors.name} />
                )}
                <InputField id="auth-email" label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" error={errors.email} />
                <InputField id="auth-password" label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" error={errors.password}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                {mode === 'signup' && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                    className="text-xs rounded-xl px-3 py-2.5 flex items-center gap-2"
                    style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.15)', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--primary)' }}>✦</span>
                    After sign up, you&apos;ll choose your role — Buyer, Provider, or both.
                  </motion.p>
                )}

                {/* ── OAuth Social Buttons (only on login, shown on both) ── */}
                <div className="space-y-2.5">
                  <SocialButton
                    provider="google"
                    label="Continue with Google"
                    onClick={() => signInWithOAuth('google')}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    }
                  />
                  <SocialButton
                    provider="github"
                    label="Continue with GitHub"
                    onClick={() => signInWithOAuth('github')}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>or</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                <motion.button id="auth-submit" type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.97 }}
                  className="btn-primary w-full mt-2 justify-center py-3">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight size={15} /></>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            <p className="text-center text-xs mt-5" style={{ color: 'var(--text-dim)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="font-semibold transition" style={{ color: 'var(--primary)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-h)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--primary)'}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>

          <p className="text-center text-[10px] mt-4" style={{ color: 'var(--text-dim)' }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
