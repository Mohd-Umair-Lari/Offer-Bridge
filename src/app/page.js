"use client";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth, ROLE_LABELS } from '@/lib/authContext';
import { SkeletonDashboard } from '@/components/shared/SkeletonLoaders';
import {
  LayoutGrid, ShoppingBag, PlusCircle, CreditCard,
  Search, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight,
  Settings, LogOut, Wallet, Sun, Moon, Command, X, ShieldAlert
} from 'lucide-react';

import LandingPage from '@/components/landing/LandingPage';
import AuthScreen from '@/components/auth/AuthScreen';
import OnboardingWizard from '@/components/auth/OnboardingWizard';
import BuyerDashboard from '@/components/buyer/BuyerDashboard';
import NewRequest from '@/components/buyer/NewRequest';
import CardholderDashboard from '@/components/cardholder/CardholderDashboard';
import BrowseRequests from '@/components/cardholder/BrowseRequests';
import MyCards from '@/components/cardholder/MyCards';
import AdminOverview from '@/components/admin/AdminOverview';
import ProsumerDashboard from '@/components/prosumer/ProsumerDashboard';
import NotificationBell from '@/components/shared/NotificationBell';
import PaymentModal from '@/components/shared/PaymentModal';
import TrackingModal from '@/components/shared/TrackingModal';

const BUYER_NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutGrid },
  { id: 'browse',      label: 'Marketplace', icon: ShoppingBag },
  { id: 'new-request', label: 'New Request', icon: PlusCircle },
];
const PROVIDER_NAV = [
  { id: 'dashboard', label: 'Dashboard',   icon: LayoutGrid },
  { id: 'browse',    label: 'Marketplace', icon: ShoppingBag },
  { id: 'my-cards',  label: 'My Cards',    icon: CreditCard },
];
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Overview',  icon: LayoutGrid },
];

function getNavSections(role) {
  switch (role) {
    case 'admin':    return [{ label: 'Admin',    items: ADMIN_NAV }];
    case 'customer': return [{ label: 'Buyer',    items: BUYER_NAV }];
    case 'provider': return [{ label: 'Provider', items: PROVIDER_NAV }];
    case 'customer_provider': return [
      { label: 'Buyer',    items: [
        { id: 'dashboard',   label: 'Dashboard',   icon: LayoutGrid },
        { id: 'new-request', label: 'New Request', icon: PlusCircle },
      ]},
      { label: 'Provider', items: [
        { id: 'browse',   label: 'Marketplace', icon: ShoppingBag },
        { id: 'my-cards', label: 'My Cards',        icon: CreditCard },
      ]},
    ];
    default: return [{ label: 'Buyer', items: BUYER_NAV }];
  }
}

function renderContent(role, activeTab, db, onRefresh, user, onPaymentAction, onTrackingAction, refreshKey) {
  const myRequests     = db.requests.filter(r => r.user_id === user?.id);
  const myOffers       = db.offers.filter(o => o.user_id === user?.id);
  const marketRequests = db.requests.filter(r => r.user_id !== user?.id);
  const myTransactions = db.transactions.filter(t => t.provider_id === user?.id);

  if (activeTab === 'dashboard') {
    if (role === 'admin')             return <AdminOverview requests={db.requests} offers={db.offers} transactions={db.transactions} />;
    if (role === 'provider')          return <CardholderDashboard offers={myOffers} transactions={myTransactions} requests={db.requests} onTrackingAction={onTrackingAction} refreshKey={refreshKey} />;
    if (role === 'customer_provider') return <ProsumerDashboard requests={myRequests} offers={myOffers} onPaymentAction={onPaymentAction} onTrackingAction={onTrackingAction} onRefresh={onRefresh} refreshKey={refreshKey} />;
    return <BuyerDashboard requests={myRequests} onPaymentAction={onPaymentAction} onRefresh={onRefresh} refreshKey={refreshKey} />;
  }
  if (activeTab === 'new-request')  return <NewRequest onCreated={onRefresh} />;
  if (activeTab === 'browse' || activeTab === 'marketplace') return <BrowseRequests requests={marketRequests} offers={myOffers} transactions={myTransactions} />;
  if (activeTab === 'my-cards')     return <MyCards offers={myOffers} userId={user?.id} onRefresh={onRefresh} />;
  return <div className="text-center py-20 text-zinc-500">Coming soon</div>;
}

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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-white/5 border border-white/10 text-zinc-400 hover:text-white"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Sun size={15} />
          </motion.span>
        ) : (
          <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Moon size={15} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

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
        className="flex items-center gap-2.5 p-1 rounded-lg transition hover:bg-white/5"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs bg-white text-black shadow-sm">
          {initial}
        </div>
        <div className="hidden sm:block text-left pr-1">
          <p className="text-xs font-semibold leading-none text-white">{displayName?.split(' ')[0]}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">{ROLE_LABELS[role] ?? role}</p>
        </div>
        <ChevronDown size={12} className={`transition-transform text-zinc-500 ${open ? 'rotate-180' : ''}`} />
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
              className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl p-1 bg-[#18181b] border border-white/10 shadow-2xl"
            >
              <div className="px-3 py-2.5 mb-1 border-b border-white/10">
                <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">{ROLE_LABELS[role] ?? role}</span>
              </div>
              <button
                id="user-menu-signout"
                onClick={handleClick}
                disabled={signingOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition text-red-400 hover:bg-red-500/10 disabled:opacity-50"
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

export default function OfferBridges() {
  const { user, role, displayName, loading: authLoading, signOut, needsOnboarding } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [db, setDb] = useState({ requests: [], offers: [], transactions: [] });
  const [dbLoading, setDbLoading] = useState(true);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [paymentTx, setPaymentTx]       = useState(null);
  const [trackingTx, setTrackingTx]     = useState(null);
  const [dashRefreshKey, setDashRefreshKey] = useState(0);

  const openPaymentModal = useCallback(async (txId, txObj) => {
    if (txObj) { setPaymentTx(txObj); return; }
    try {
      const res = await api.getTransactions(user?.id);
      const tx = (res.data || []).find(t => t.id === txId || t._id === txId);
      if (tx) setPaymentTx(tx);
    } catch {}
  }, [user?.id]);

  const openTrackingModal = useCallback(async (txId, txObj) => {
    if (txObj) { setTrackingTx(txObj); return; }
    try {
      const res = await api.getTransactions(user?.id);
      const tx = (res.data || []).find(t => t.id === txId || t._id === txId);
      if (tx) setTrackingTx(tx);
    } catch {}
  }, [user?.id]);

  const handleSignOut = useCallback(async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  }, [signOut]);

  const fetchAll = useCallback(async () => {
    setDbLoading(true);
    try {
      const res = await api.fetchAll();
      setDb({
        requests: res.requests || [],
        offers:       res.offers   || [],
        transactions: res.transactions || [],
      });
    } catch (err) {
      console.error('[DB] Fetch error:', err);
      setDb({ requests: [], offers: [], transactions: [] });
    } finally {
      setDbLoading(false);
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

  useEffect(() => {
    if (!user?.id) return;
    const id = setInterval(() => {
      api.fetchAll().then(res => {
        setDb({
          requests: res.requests || [],
          offers:       res.offers   || [],
          transactions: res.transactions || [],
        });
        setDashRefreshKey(k => k + 1);
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [user?.id]);

  // Keyboard shortcut ⌘K / Ctrl+K listener for Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTab = (id) => { setActiveTab(id); };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xl shadow-lg">
            A
          </div>
          <p className="text-xs text-zinc-400">Loading OfferBridges…</p>
        </div>
      </div>
    );
  }

  if (!user && showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  if (!user) return <AuthScreen onBack={() => setShowLanding(true)} />;

  if (needsOnboarding) return <OnboardingWizard />;

  const navSections = getNavSections(role);
  const activeTabTitle = 
    activeTab === 'dashboard' ? (role === 'admin' ? 'Overview' : 'Home') :
    activeTab === 'browse' || activeTab === 'marketplace' ? 'Marketplace' :
    activeTab === 'new-request' ? 'New Request' :
    activeTab === 'my-cards' ? 'My Cards' : 'Dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-white font-sans selection:bg-white selection:text-black">
      {/* Modals */}
      {paymentTx && (
        <PaymentModal
          tx={paymentTx}
          onClose={() => setPaymentTx(null)}
          onSuccess={() => {
            setPaymentTx(null);
            setDashRefreshKey(k => k + 1);
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
            setDashRefreshKey(k => k + 1);
            fetchAll();
          }}
        />
      )}

      {/* Main Container Wrapper */}
      <div className="flex flex-1 relative h-screen overflow-hidden">

        {/* ── Dashboard Sidebar (Matching Screenshot Exactly) ──────────────── */}
        <aside
          className={`
            hidden md:flex flex-col flex-shrink-0
            transition-all duration-300 ease-in-out
            bg-[#111113] border-r border-white/10 p-3 z-40 select-none
            ${desktopCollapsed ? 'w-20' : 'w-[260px]'}
          `}
        >
          {/* Workspace Switcher */}
          <div className="relative mb-3">
            <div className={`flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${desktopCollapsed ? 'justify-center' : ''}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-[6px] bg-white text-black flex items-center justify-center font-semibold text-[13px] shadow-sm shrink-0">
                  {displayName?.[0]?.toUpperCase() ?? 'A'}
                </div>
                {!desktopCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[13px] font-medium leading-none mb-1 text-white truncate max-w-[130px]">
                      OfferBridges
                    </span>
                    <span className="text-[11px] text-zinc-400 leading-none truncate">
                      {ROLE_LABELS[role] ?? 'Pro Plan'}
                    </span>
                  </div>
                )}
              </div>
              {!desktopCollapsed && (
                <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
            </div>
          </div>

          {/* Quick Search Item */}
          {!desktopCollapsed && (
            <div
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-between px-2.5 py-[7px] mb-2 rounded-[6px] text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer transition-colors text-[13px]"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                <span>Search</span>
              </div>
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-mono text-zinc-500 bg-white/5 border border-white/10 rounded-[4px]">
                ⌘K
              </kbd>
            </div>
          )}

          {/* Navigation Groups */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden flex flex-col gap-4 mt-1">
            {navSections.map(({ label, items }) => (
              <div key={label} className="flex flex-col gap-0.5">
                {!desktopCollapsed && (
                  <span className="px-2.5 mb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                    {label}
                  </span>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleTab(item.id)}
                      className={`group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer transition-all duration-200 select-none ${
                        isActive
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                      } ${desktopCollapsed ? 'justify-center px-0' : ''}`}
                      title={desktopCollapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-[16px] h-[16px] transition-colors ${
                            isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                          }`}
                          strokeWidth={1.5}
                        />
                        {!desktopCollapsed && (
                          <span className="text-[13px] tracking-wide truncate">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {!desktopCollapsed && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-transform" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Items */}
          <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-0.5">
            {!desktopCollapsed && (
              <div
                onClick={() => setIsSearchOpen(true)}
                className="group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-[16px] h-[16px] text-zinc-500 group-hover:text-zinc-300" strokeWidth={1.5} />
                  <span className="text-[13px]">Settings</span>
                </div>
                <kbd className="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-mono text-zinc-500 bg-white/5 border border-white/10 rounded-[4px]">
                  ⌘,
                </kbd>
              </div>
            )}
            <div
              onClick={handleSignOut}
              className={`group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer text-red-400 hover:bg-red-500/10 transition-colors ${
                desktopCollapsed ? 'justify-center px-0' : ''
              }`}
              title={desktopCollapsed ? 'Log out' : undefined}
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-[16px] h-[16px]" strokeWidth={1.5} />
                {!desktopCollapsed && <span className="text-[13px]">Log out</span>}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Area (Header Bar + Content) ───────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] overflow-hidden">
          
          {/* Header Bar (Matching Top Bar in Screenshot) */}
          <header className="h-14 border-b border-white/10 flex items-center px-4 md:px-6 justify-between bg-[#141417] shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                className="p-1.5 rounded-md text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                title="Toggle Sidebar"
              >
                {desktopCollapsed ? (
                  <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />
                ) : (
                  <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.5} />
                )}
              </button>
              
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="truncate">OfferBridges</span>
                <span>/</span>
                <span className="font-medium text-white truncate">{activeTabTitle}</span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Quick search input */}
              <div
                onClick={() => setIsSearchOpen(true)}
                className="hidden md:flex items-center gap-2 w-64 h-8 bg-white/5 border border-white/10 rounded-md px-3 text-xs text-zinc-400 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <Search size={14} className="text-zinc-500" />
                <span className="flex-1 truncate">Search dashboard…</span>
                <kbd className="text-[10px] font-mono text-zinc-500 bg-white/5 px-1 rounded">⌘K</kbd>
              </div>

              <NotificationBell onPaymentAction={openPaymentModal} onTrackingAction={openTrackingModal} />
              <ThemeToggle />
              <UserMenu displayName={displayName} role={role} onSignOut={handleSignOut} />
            </div>
          </header>

          {/* Main Content Scroll Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#09090b]">
            <div className="max-w-6xl mx-auto">
              {dbLoading && !db.requests.length ? (
                <SkeletonDashboard />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderContent(role, activeTab, db, fetchAll, user, openPaymentModal, openTrackingModal, dashRefreshKey)}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </main>
        </div>

        {/* ── Command Palette / Search Modal (⌘K) ───────────────────── */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm px-4">
            <div className="fixed inset-0" onClick={() => setIsSearchOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              className="relative w-full max-w-xl bg-[#141417] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="flex items-center px-4 border-b border-white/10">
                <Search className="w-[18px] h-[18px] text-zinc-400 mr-3 shrink-0" strokeWidth={1.5} />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent py-4 outline-none text-sm text-white placeholder:text-zinc-500"
                  placeholder="Search requests, cards, or actions..."
                />
                <kbd
                  onClick={() => setIsSearchOpen(false)}
                  className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 ml-2 text-[10px] font-mono text-zinc-400 bg-white/10 border border-white/10 rounded cursor-pointer hover:text-white transition-colors"
                >
                  ESC
                </kbd>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="ml-3 p-1 rounded text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </button>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto">
                {searchQuery.trim() ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-2">Results</p>
                    {db.requests
                      .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 5)
                      .map(r => (
                        <div
                          key={r.id}
                          onClick={() => { setActiveTab('browse'); setIsSearchOpen(false); }}
                          className="p-2.5 rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-medium text-white truncate">{r.title}</span>
                          <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded">{r.category}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-6 flex flex-col items-center justify-center text-center">
                    <Command className="w-6 h-6 text-zinc-600 mb-2" strokeWidth={1.5} />
                    <p className="text-xs text-zinc-400 font-medium">Type a command or search requests...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}