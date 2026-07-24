"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/authContext';
import { Wallet, Eye, EyeOff, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

const IconGoogle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" {...props}>
    <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.386-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.85l3.25-3.138C18.189 1.186 15.479 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.885 0 11.954-4.823 11.954-12.015 0-.795-.084-1.588-.239-2.356H12.24z" fill="currentColor"/>
  </svg>
);

const IconGithub = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/>
  </svg>
);

export default function AuthScreen({ onBack }) {
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: null }));
    setServerError('');
  };

  const validate = () => {
    const errs = {};
    if (isSignUp && !form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Min 6 characters';
    return errs;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      if (isSignUp) {
        const { error } = await signUp(form.email, form.password, form.name.trim());
        if (error) setServerError(error.message);
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) setServerError(error.message);
      }
    } catch (err) {
      setServerError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#09090b] text-white p-4 font-sans selection:bg-white selection:text-black">
      <div className="flex flex-col items-center justify-center w-full max-w-sm">
        
        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-[#141417] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-white text-black shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {isSignUp
                ? 'Enter your details to create your account.'
                : 'Enter your credentials to access your account.'}
            </p>
          </div>

          {/* Server Error Alert */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2"
              >
                <AlertCircle size={14} className="shrink-0" />
                <span>{serverError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card Content */}
          <div className="mt-6 flex flex-col gap-3">

            {!showEmailForm ? (
              <>
                {/* Primary Google Action */}
                <button
                  id="oauth-google"
                  type="button"
                  onClick={() => signInWithOAuth('google')}
                  className="w-full h-10 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-sm"
                >
                  <IconGoogle />
                  <span>Continue with Google</span>
                </button>

                {/* OR Separator */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
                    <span className="bg-[#141417] px-2 text-zinc-500">OR</span>
                  </div>
                </div>

                {/* Secondary Actions */}
                <div className="flex flex-col gap-2">
                  {/* Email Login Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(true)}
                    className="w-full h-10 rounded-lg bg-[#222226] hover:bg-[#2b2b30] border border-white/5 text-white font-medium text-xs flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Mail size={16} />
                    <span>Continue with Email</span>
                  </button>

                  {/* GitHub Login Button */}
                  <button
                    id="oauth-github"
                    type="button"
                    onClick={() => signInWithOAuth('github')}
                    className="w-full h-10 rounded-lg bg-[#222226] hover:bg-[#2b2b30] border border-white/5 text-white font-medium text-xs flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <IconGithub />
                    <span>Continue with Github</span>
                  </button>
                </div>

                {/* Skip Action Button */}
                <div className="mt-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={onBack || (() => window.location.href = '/')}
                    className="w-full h-10 rounded-lg bg-black/40 hover:bg-black/70 border border-white/10 text-zinc-300 font-medium text-xs flex items-center justify-center transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Skip for now
                  </button>
                </div>
              </>
            ) : (
              /* Expanded Email/Password Form */
              <motion.form
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                onSubmit={handleEmailSubmit}
                className="flex flex-col gap-3"
              >
                {isSignUp && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Jane Doe"
                      className="w-full h-9 px-3 rounded-lg bg-[#09090b] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                    />
                    {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="name@example.com"
                    className="w-full h-9 px-3 rounded-lg bg-[#09090b] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                  />
                  {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="••••••••"
                      className="w-full h-9 pl-3 pr-9 rounded-lg bg-[#09090b] border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 mt-1 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : isSignUp ? (
                    'Create Account'
                  ) : (
                    'Sign In with Email'
                  )}
                </button>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="text-zinc-400 hover:text-white transition flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Back to options
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setErrors({});
                      setServerError('');
                    }}
                    className="text-white hover:underline font-medium"
                  >
                    {isSignUp ? 'Already have account?' : 'Need an account?'}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-6 w-full max-w-xs text-center text-xs text-zinc-500 leading-relaxed">
          By logging in, you agree to our{' '}
          <a href="#" className="underline text-zinc-400 hover:text-white transition">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline text-zinc-400 hover:text-white transition">Privacy Policy</a>.
        </div>

      </div>
    </div>
  );
}
