"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Lock, ArrowLeft, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [phase, setPhase] = useState('validating'); // validating | form | success | error
  const [email, setEmail] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No reset token found. Please request a new password reset link.');
      setPhase('error');
      return;
    }

    async function validate() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.valid) {
          setEmail(data.email || '');
          setPhase('form');
        } else {
          setTokenError(data.error || 'This reset link has expired or is invalid. Please request a new one.');
          setPhase('error');
        }
      } catch {
        setTokenError('Unable to validate your reset link. Please try again.');
        setPhase('error');
      }
    }

    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to reset password. Please try again.');
        return;
      }
      // Auto-sign in using the correct token key used throughout the app
      if (data.token) {
        localStorage.setItem('gz-token', data.token);
        if (data.user) localStorage.setItem('gz-user', JSON.stringify(data.user));
      }
      setPhase('success');
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#09090b] p-4" style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
          style={{ background: '#141417', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 48px rgba(0,0,0,0.7)' }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ width: '36px', height: '36px', background: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Offer Bridge</span>
          </div>

          <AnimatePresence mode="wait">

            {/* ── VALIDATING ── */}
            {phase === 'validating' && (
              <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '32px 0' }}>
                <Loader2 size={36} style={{ color: '#a1a1aa', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#a1a1aa', fontSize: '14px' }}>Validating your reset link…</p>
              </motion.div>
            )}

            {/* ── ERROR ── */}
            {phase === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '48px', height: '48px', background: 'rgba(239,68,68,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <AlertCircle size={24} style={{ color: '#ef4444' }} />
                  </div>
                  <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Link Expired</h1>
                  <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{tokenError}</p>
                </div>
                <a href="/"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', height: '40px', background: '#ffffff', color: '#09090b', borderRadius: '10px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                  <ArrowLeft size={14} /> Back to Login
                </a>
              </motion.div>
            )}

            {/* ── FORM ── */}
            {phase === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ marginBottom: '24px' }}>
                  <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.3px' }}>Choose a New Password</h1>
                  <p style={{ color: '#71717a', fontSize: '12px', margin: 0 }}>
                    For <strong style={{ color: '#a1a1aa' }}>{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* Password Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#71717a', marginBottom: '6px', letterSpacing: '0.02em' }}>
                      NEW PASSWORD
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        autoFocus
                        required
                        style={{ width: '100%', height: '40px', padding: '0 36px 0 12px', boxSizing: 'border-box', background: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex' }}>
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {/* Strength meter */}
                    {password && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                          {[1,2,3,4].map(i => (
                            <div key={i} style={{ height: '3px', flex: 1, borderRadius: '99px', background: i <= strength ? strengthColor : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />
                          ))}
                        </div>
                        <p style={{ fontSize: '10px', color: strengthColor, margin: 0 }}>{strengthLabel}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Field */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#71717a', marginBottom: '6px', letterSpacing: '0.02em' }}>
                      CONFIRM PASSWORD
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat password"
                        required
                        style={{ width: '100%', height: '40px', padding: '0 36px 0 12px', boxSizing: 'border-box', background: '#09090b', border: `1px solid ${confirm && confirm !== password ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                        onBlur={e => e.target.style.borderColor = (confirm && confirm !== password ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)')}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', display: 'flex' }}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirm && confirm !== password && (
                      <p style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>Passwords do not match</p>
                    )}
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {formError && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#ef4444', fontSize: '12px' }}>
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        {formError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button type="submit" disabled={loading || !password || !confirm}
                    style={{ width: '100%', height: '42px', background: loading ? 'rgba(255,255,255,0.6)' : '#ffffff', color: '#09090b', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }}>
                    {loading ? (
                      <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Resetting…</>
                    ) : (
                      <><Lock size={14} /> Reset Password</>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── SUCCESS ── */}
            {phase === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 20, delay: 0.1 }}
                  style={{ width: '56px', height: '56px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={28} style={{ color: '#10b981' }} />
                </motion.div>
                <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px' }}>Password Reset!</h1>
                <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: 1.6, margin: '0 0 28px' }}>
                  Your password has been updated successfully. You are now signed in.
                </p>
                <button onClick={() => router.push('/')}
                  style={{ width: '100%', height: '42px', background: '#ffffff', color: '#09090b', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Go to Dashboard →
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#52525b' }}>
          © {new Date().getFullYear()} Offer Bridge · Secure Password Reset
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09090b' }}>
        <Loader2 size={32} style={{ color: '#a1a1aa', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
