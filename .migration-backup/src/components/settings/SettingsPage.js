"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, ROLE_LABELS } from '@/lib/authContext';
import { User, Mail, Phone, Calendar, ShieldCheck, CheckCircle2, Save, Lock, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser, displayName, role } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Determine if email change is restricted (e.g. Gmail / OAuth logins)
  const isOAuthAccount = 
    user?.provider === 'google' || 
    user?.provider === 'github' || 
    (user?.email && user.email.toLowerCase().endsWith('@gmail.com'));

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || user.name || displayName || '',
        email: user.email || '',
        phone: user.phone || user.mobile || '',
        age: user.age || '',
      });
    }
  }, [user, displayName]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }
    if (!isOAuthAccount && !form.email.trim()) {
      setErrorMsg('Email address cannot be empty.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (updateUser) {
        await updateUser({
          fullName: form.fullName.trim(),
          ...(isOAuthAccount ? {} : { email: form.email.trim() }),
          phone: form.phone.trim(),
          age: form.age,
        });
      }
      setSuccessMsg('Account details saved successfully!');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Account Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your personal details, email, and contact information.
        </p>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold"
            style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold text-red-400"
            style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Settings Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 border shadow-sm"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <form onSubmit={handleSave} className="space-y-5">
          
          {/* User Role Card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs"
                style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
                {user?.fullName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>Account Role</p>
                <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{user?.email || 'Logged in user'}</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold border"
              style={{ background: 'var(--surface3)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              <ShieldCheck size={12} className="inline mr-1 text-emerald-400" />
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <User size={13} style={{ color: 'var(--text-dim)' }} />
                Full Name
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                placeholder="Jane Doe"
                className="w-full h-10 px-3.5 rounded-xl text-xs border outline-none transition"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Mail size={13} style={{ color: 'var(--text-dim)' }} />
                  Email Address
                </label>
                {isOAuthAccount && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1 font-medium">
                    <Lock size={10} /> Google / OAuth
                  </span>
                )}
              </div>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                disabled={isOAuthAccount}
                placeholder="name@example.com"
                className={`w-full h-10 px-3.5 rounded-xl text-xs border outline-none transition ${
                  isOAuthAccount ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              {isOAuthAccount && (
                <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                  Email is managed by your OAuth provider and cannot be modified.
                </p>
              )}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Phone size={13} style={{ color: 'var(--text-dim)' }} />
                Mobile Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="+91 98765 43210"
                className="w-full h-10 px-3.5 rounded-xl text-xs border outline-none transition"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Age */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={13} style={{ color: 'var(--text-dim)' }} />
                Age
              </label>
              <input
                type="number"
                min="18"
                max="120"
                value={form.age}
                onChange={handleChange('age')}
                placeholder="25"
                className="w-full h-10 px-3.5 rounded-xl text-xs border outline-none transition"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

          </div>

          {/* Action Footer */}
          <div className="pt-4 flex justify-end border-t" style={{ borderColor: 'var(--border)' }}>
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--bg)' }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={14} /> Save Changes
                </>
              )}
            </motion.button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
