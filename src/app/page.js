"use client";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/lib/authContext';
import { SkeletonDashboard } from '@/components/shared/SkeletonLoaders';
import { MOCK_REQUESTS, MOCK_OFFERS, MOCK_ESCROW, MOCK_DISPUTES } from '@/lib/mockData';
import {
  LayoutGrid, ShoppingBag, PlusCircle, CreditCard,
  DollarSign, ShieldAlert, Menu, X, Wallet,
  LogOut, ChevronDown, User, Sun, Moon,
  Bell, Settings, Zap, RefreshCw, BarChart2,
} from 'lucide-react';

import LandingPage from '@/components/landing/LandingPage';
import AuthScreen from '@/components/auth/AuthScreen';
import BuyerDashboard from '@/components/buyer/BuyerDashboard';
import Marketplace from '@/components/buyer/Marketplace';
import NewRequest from '@/components/buyer/NewRequest';
import CardholderDashboard from '@/components/cardholder/CardholderDashboard';
import BrowseRequests from '@/components/cardholder/BrowseRequests';
import MyCards from '@/components/cardholder/MyCards';
import AdminOverview from '@/components/admin/AdminOverview';
import Escrow from '@/components/admin/Escrow';
import Disputes from '@/components/admin/Disputes';
import ProsumerDashboard from '@/components/prosumer/ProsumerDashboard';
import NotificationBell from '@/components/shared/NotificationBell';
import PaymentModal from '@/components/shared/PaymentModal';
import TrackingModal from '@/components/shared/TrackingModal';

// ── Nav config ─────────────────────────────────────────────────
const BUYER_NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutGrid },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'new-request', label: 'New Request', icon: PlusCircle },
];
const PROVIDER_NAV = [
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutGrid },
  { id: 'browse',    label: 'Browse Requests', icon: ShoppingBag },
  { id: 'my-cards',  label: 'My Cards',        icon: CreditCard },
];
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Overview',  icon: LayoutGrid },
  { id: 'escrow',    label: 'Escrow',    icon: DollarSign },
  { id: 'disputes',  label: 'Disputes',  icon: ShieldAlert },
];

function getNavSections(role) {
  switch (role) {
    case 'admin':    return [{ label: 'Admin',    items: ADMIN_NAV }];
    case 'customer': return [{ label: 'Buyer',    items: BUYER_NAV }];
    case 'provider': return [{ label: 'Provider', items: PROVIDER_NAV }];
    case 'customer_provider': return [
      { label: 'Buyer',    items: BUYER_NAV },
      { label: 'Provider', items: [
        { id: 'browse',   label: 'Browse Requests', icon: ShoppingBag },
        { id: 'my-cards', label: 'My Cards',        icon: CreditCard },
      ]},
    ];
    default: return [{ label: 'Buyer', items: BUYER_NAV }];
  }
}

// ── Content renderer ────────────────────────────────────────────
// ── Content renderer ────────────────────────────────────────────
function renderContent(role, activeTab, db, onRefresh, user, onPaymentAction, onTrackingAction, refreshKey) {
  const myRequests     = db.requests.filter(r => r.user_id === user?.id);
  const myOffers       = db.offers.filter(o => o.user_id === user?.id);
  const publicRequests = db.requests.filter(r => r.is_public !== false && r.status === 'pending');
  const marketRequests = db.requests.filter(r => r.user_id !== user?.id);

  if (activeTab === 'dashboard') {
    if (role === 'admin')             return <AdminOverview requests={db.requests} offers={db.offers} escrow={db.escrow} disputes={db.disputes} />;
    if (role === 'provider')          return <CardholderDashboard offers={myOffers} requests={myRequests} onTrackingAction={onTrackingAction} refreshKey={refreshKey} />;
    if (role === 'customer_provider') return <ProsumerDashboard requests={myRequests} offers={myOffers} />;
    return <BuyerDashboard requests={myRequests} onPaymentAction={onPaymentAction} refreshKey={refreshKey} />;
  }
  if (activeTab === 'marketplace')  return <Marketplace requests={publicRequests} />;
  if (activeTab === 'new-request')  return <NewRequest onCreated={onRefresh} />;
  if (activeTab === 'browse')       return <BrowseRequests requests={marketRequests} offers={myOffers} />;
  if (activeTab === 'my-cards')     return <MyCards offers={myOffers} userId={user?.id} onRefresh={onRefresh} />;
  if (activeTab === 'escrow')       return <Escrow escrow={db.escrow} onRefresh={onRefresh} />;
  if (activeTab === 'disputes')     return <Disputes disputes={db.disputes} onRefresh={onRefresh} />;
  return <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>Coming soon</div>;
}


// ── Theme Toggle ────────────────────────────────────────────────
function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('ob-theme') || 'dark';
    setTheme(saved);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ob-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <motion.button
      id="theme-toggle"
      onClick={toggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
      style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Sun size={16} />
          </motion.span>
        ) : (
          <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Moon size={16} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── User Menu ───────────────────────────────────────────────────
function UserMenu({ displayName, role, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const initial = displayName?.[0]?.toUpperCase() ?? 'U';

  const handleClick = useCallback(async () => {
    setSigningOut(true);
    try { await onSignOut(); setOpen(false); }
    catch { setSigningOut(false); }
  }, [onSignOut]);

  return (
    <div className="relative">
      <motion.button
        id="user-menu-btn"
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition"
        style={{ background: open ? 'var(--surface2)' : 'transparent' }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 2px 8px var(--primary-glow)' }}>
          {initial}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold leading-none" style={{ color: 'var(--text)' }}>{displayName?.split(' ')[0]}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{ROLE_LABELS[role] ?? role}</p>
        </div>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-dim)' }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 z-50 rounded-2xl p-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
            >
              <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--border2)' }}>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{displayName}</p>
                <span className="badge badge-purple mt-1 text-[10px]">{ROLE_LABELS[role] ?? role}</span>
              </div>
              <button
                id="user-menu-signout"
                onClick={handleClick}
                disabled={signingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl transition disabled:opacity-50"
                style={{ color: '#ef4444' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={14} />
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// NotifBell is now imported from shared/NotificationBell (live DB-connected)

// ── Sidebar Nav Item ────────────────────────────────────────────
function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon;
  return (
    <motion.button
      key={item.id}
      id={`nav-${item.id}`}
      onClick={onClick}
      whileHover={{ x: 2 }}
      className={`nav-item ${isActive ? 'active' : ''}`}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-pill"
          className="absolute inset-0 rounded-xl"
          style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.2)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2.5 w-full">
        <Icon size={16} style={{ color: isActive ? 'var(--primary)' : 'var(--text-dim)' }} />
        {item.label}
      </span>
    </motion.button>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function GoZivo() {
  const { user, role, displayName, loading: authLoading, signOut } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [db, setDb] = useState({ requests: [], offers: [], escrow: [], disputes: [] });
  const [dbLoading, setDbLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // ── Payment portal state ────────────────────────────────────────
  const [paymentTx, setPaymentTx]       = useState(null);
  const [trackingTx, setTrackingTx]     = useState(null);
  const [dashRefreshKey, setDashRefreshKey] = useState(0); // increments to trigger banner refresh

  // Open PaymentModal — (txId, txObj?) txObj skips re-fetch when called from dashboard
  const openPaymentModal = useCallback(async (txId, txObj) => {
    if (txObj) { setPaymentTx(txObj); return; }
    try {
      const res = await api.getTransactions(user?.id);
      const tx = (res.data || []).find(t => t.id === txId || t._id === txId);
      if (tx) setPaymentTx(tx);
    } catch { /* ignore */ }
  }, [user?.id]);

  // Open TrackingModal — (txId, txObj?) txObj skips re-fetch when called from dashboard
  const openTrackingModal = useCallback(async (txId, txObj) => {
    if (txObj) { setTrackingTx(txObj); return; }
    try {
      const res = await api.getTransactions(user?.id);
      const tx = (res.data || []).find(t => t.id === txId || t._id === txId);
      if (tx) setTrackingTx(tx);
    } catch { /* ignore */ }
  }, [user?.id]);

  const handleSignOut = useCallback(async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  }, [signOut]);

  const fetchAll = useCallback(async () => {
    setDbLoading(true);
    setIsFetching(true);
    try {
      const res = await api.fetchAll();
      setDb({
        requests: res.requests || [],
        offers:   res.offers   || [],
        escrow:   res.escrow   || [],
        disputes: res.disputes || [],
      });
    } catch (err) {
      console.error('[DB] Fetch error:', err);
      setDb({ requests: [], offers: [], escrow: [], disputes: [] });
    } finally {
      setDbLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    if (role) {
      setActiveTab('dashboard');
      fetchAll();
      api.runRefundCheck().catch(() => {});
    }
  }, [user?.id, role, authLoading, fetchAll]);

  // ── 30-second auto-poll to keep all data live ─────────────────
  useEffect(() => {
    if (!user?.id) return;
    const id = setInterval(() => {
      // Silent re-fetch: don't show loading skeleton, just update state
      api.fetchAll().then(res => {
        setDb({
          requests: res.requests || [],
          offers:   res.offers   || [],
          escrow:   res.escrow   || [],
          disputes: res.disputes || [],
        });
        // Also bump dashRefreshKey so transaction banners refresh
        setDashRefreshKey(k => k + 1);
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [user?.id]);

  const handleTab = (id) => { setActiveTab(id); setMobileOpen(false); };

  // ── Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 0 30px var(--primary-glow)' }}>
              <Wallet size={24} className="text-white" />
            </div>
            <div className="absolute -inset-2 rounded-2xl border-2 animate-pulse-ring" style={{ borderColor: 'var(--primary)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading GoZivo…</p>
        </div>
      </div>
    );
  }

  if (!user && showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  if (!user) return <AuthScreen onBack={() => setShowLanding(true)} />;

  const navSections = getNavSections(role);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* ── Payment Modals ──────────────────────────────────────── */}
      {paymentTx && (
        <PaymentModal
          tx={paymentTx}
          onClose={() => setPaymentTx(null)}
          onSuccess={() => {
            setPaymentTx(null);
            setDashRefreshKey(k => k + 1); // triggers BuyerDashboard to re-fetch → banner disappears
            fetchAll();
          }}
        />
      )}
      {trackingTx && (
        <TrackingModal
          tx={trackingTx}
          onClose={() => setTrackingTx(null)}
          onSuccess={() => {
            setTrackingTx(null);
            setDashRefreshKey(k => k + 1); // triggers CardholderDashboard to re-fetch → banner disappears
            fetchAll();
          }}
        />
      )}

      {/* ── Topbar ───────────────────────────────────────────── */}
      <nav className="h-14 glass flex items-center justify-between px-4 md:px-6 sticky top-0 z-50"
        style={{ borderBottom: '1px solid var(--border)' }}>

        <div className="flex items-center gap-3">
          <button id="mobile-menu-btn"
            className="md:hidden p-1.5 rounded-lg transition"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 2px 12px var(--primary-glow)' }}>
              <Wallet size={15} className="text-white" />
            </div>
            <span className="font-bold text-lg leading-none">
              <span className="gradient-text">Go</span>
              <span style={{ color: 'var(--text)', fontWeight: 400 }}>Zivo</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            id="refresh-btn"
            onClick={() => fetchAll()}
            disabled={isFetching}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </motion.button>
          <NotificationBell
            onPaymentAction={openPaymentModal}
            onTrackingAction={openTrackingModal}
          />
          <ThemeToggle />
          <UserMenu displayName={displayName} role={role} onSignOut={handleSignOut} />
        </div>
      </nav>

      <div className="flex flex-1 relative overflow-hidden">

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 md:hidden"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className={`
          fixed md:static top-14 left-0 bottom-0 z-40
          w-56 flex-shrink-0 flex flex-col
          transform transition-transform duration-200 ease-out
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `} style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>

          <div className="p-3 flex-1 overflow-y-auto space-y-5 pt-4">
            {navSections.map(({ label, items }) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-widest font-semibold px-3 mb-2"
                  style={{ color: 'var(--text-dim)' }}>{label}</p>
                <nav className="space-y-0.5">
                  {items.map(item => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={activeTab === item.id}
                      onClick={() => handleTab(item.id)}
                    />
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* Sidebar footer */}
          <div className="p-3" style={{ borderTop: '1px solid var(--border2)' }}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
              style={{ background: 'var(--surface2)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)' }}>
                {displayName?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{displayName}</p>
                <span className="badge badge-purple text-[9px]">{ROLE_LABELS[role] ?? role}</span>
              </div>
              <button id="sidebar-signout" onClick={handleSignOut} title="Sign out"
                className="p-1.5 rounded-lg transition"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}>
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-56px)]" style={{ background: 'var(--bg)' }}>
          <div className="p-4 md:p-6 max-w-6xl">
            {dbLoading && !db.requests.length ? (
              <SkeletonDashboard />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderContent(role, activeTab, db, fetchAll, user, openPaymentModal, openTrackingModal, dashRefreshKey)}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}