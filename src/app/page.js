"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/lib/authContext';
import { SkeletonDashboard } from '@/components/shared/SkeletonLoaders';
import { MOCK_REQUESTS, MOCK_OFFERS, MOCK_ESCROW, MOCK_DISPUTES } from '@/lib/mockData';
import {
  LayoutGrid, ShoppingBag, PlusCircle, CreditCard,
  DollarSign, ShieldAlert, Menu, X, Wallet,
  Database, LogOut, ChevronDown, User,
} from 'lucide-react';

// Auth screen
import AuthScreen from '@/components/auth/AuthScreen';

// Buyer Views
import BuyerDashboard from '@/components/buyer/BuyerDashboard';
import Marketplace from '@/components/buyer/Marketplace';
import NewRequest from '@/components/buyer/NewRequest';

// Cardholder/Provider Views
import CardholderDashboard from '@/components/cardholder/CardholderDashboard';
import BrowseRequests from '@/components/cardholder/BrowseRequests';
import MyCards from '@/components/cardholder/MyCards';

// Admin Views
import AdminOverview from '@/components/admin/AdminOverview';
import Escrow from '@/components/admin/Escrow';
import Disputes from '@/components/admin/Disputes';

// Dual-Role Views
import ProsumerDashboard from '@/components/prosumer/ProsumerDashboard';

// ── Nav config ────────────────────────────────────────────────────────
const BUYER_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={16} /> },
  { id: 'marketplace', label: 'Marketplace', icon: <ShoppingBag size={16} /> },
  { id: 'new-request', label: 'New Request', icon: <PlusCircle size={16} /> },
];
const PROVIDER_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={16} /> },
  { id: 'browse', label: 'Browse Requests', icon: <ShoppingBag size={16} /> },
  { id: 'my-cards', label: 'My Cards', icon: <CreditCard size={16} /> },
];
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Overview', icon: <LayoutGrid size={16} /> },
  { id: 'escrow', label: 'Escrow', icon: <DollarSign size={16} /> },
  { id: 'disputes', label: 'Disputes', icon: <ShieldAlert size={16} /> },
];

function getNavSections(role) {
  switch (role) {
    case 'admin': return [{ label: 'Admin', items: ADMIN_NAV }];
    case 'customer': return [{ label: 'Buyer', items: BUYER_NAV }];
    case 'provider': return [{ label: 'Provider', items: PROVIDER_NAV }];
    case 'customer_provider': return [
      { label: 'Buyer', items: BUYER_NAV },
      {
        label: 'Provider', items: [
          { id: 'browse', label: 'Browse Requests', icon: <ShoppingBag size={16} /> },
          { id: 'my-cards', label: 'My Cards', icon: <CreditCard size={16} /> },
        ]
      },
    ];
    default: return [{ label: 'Buyer', items: BUYER_NAV }];
  }
}

function getDefaultTab(role) {
  return 'dashboard';
}

// ── Content renderer ──────────────────────────────────────────────────
function renderContent(role, activeTab, db, onRefresh, user) {
  // Partition data structurally to prevent leakage
  const myRequests = db.requests.filter(r => r.user_id === user?.id);
  const myOffers = db.offers.filter(o => o.user_id === user?.id);

  const marketRequests = db.requests.filter(r => r.user_id !== user?.id);
  // Marketplace = ALL public cards from ALL users (including own if browsing as buyer)
  const marketOffers = db.offers.filter(o => o.is_public !== false);

  // Debug logging for marketplace
  if (activeTab === 'marketplace') {
    console.log('[Marketplace] All public offers available:');
    console.log('  - Total in DB:', db.offers.length);
    console.log('  - Public cards:', marketOffers.length);
    marketOffers.forEach(o => {
      console.log(`    • ${o.card_name} (${o.bank}) - ₹${o.max_amount} - User: ${o.user_id}`);
    });
  }

  // 'dashboard' is context-sensitive per role
  if (activeTab === 'dashboard') {
    if (role === 'admin') return <AdminOverview requests={db.requests} offers={db.offers} escrow={db.escrow} disputes={db.disputes} />;
    if (role === 'provider') return <CardholderDashboard offers={myOffers} requests={myRequests} />;
    if (role === 'customer_provider') return <ProsumerDashboard requests={myRequests} offers={myOffers} />;
    return <BuyerDashboard requests={myRequests} />;
  }
  // Buyer tabs
  if (activeTab === 'marketplace') return <Marketplace offers={marketOffers} />;
  if (activeTab === 'new-request') return <NewRequest onCreated={onRefresh} />;
  // Provider tabs
  if (activeTab === 'browse') return <BrowseRequests requests={marketRequests} offers={myOffers} />;
  if (activeTab === 'my-cards') return <MyCards offers={myOffers} userId={user?.id} onRefresh={onRefresh} />;
  // Admin tabs
  if (activeTab === 'escrow') return <Escrow escrow={db.escrow} onRefresh={onRefresh} />;
  if (activeTab === 'disputes') return <Disputes disputes={db.disputes} onRefresh={onRefresh} />;
  return <div className="text-center py-20 text-gray-400 text-sm">Coming soon</div>;
}

// ── User menu dropdown ────────────────────────────────────────────────
function UserMenu({ displayName, role, onSignOut }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const initial = displayName?.[0]?.toUpperCase() ?? 'U';

  const handleClick = useCallback(async () => {
    setSigningOut(true);
    try {
      await onSignOut();
      setOpen(false);
    } catch (error) {
      console.error('Sign out failed:', error);
      setSigningOut(false);
    }
  }, [onSignOut]);

  return (
    <div className="relative">
      <button
        id="user-menu-btn"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition"
      >
        <div className="w-7 h-7 bg-[#E6F1FB] rounded-full flex items-center justify-center ring-2 ring-[#185FA5]/20 shrink-0">
          <span className="text-xs font-bold text-[#185FA5]">{initial}</span>
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-700 leading-none">{displayName?.split(' ')[0]}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{ROLE_LABELS[role] ?? role}</p>
        </div>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 animate-fade-in">
            <div className="px-3 py-2.5 border-b border-gray-50 mb-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}>
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
            <button
              id="user-menu-signout"
              onClick={handleClick}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={14} />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────
export default function OfferBridge() {
  const { user, role, displayName, loading: authLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [db, setDb] = useState({ requests: [], offers: [], escrow: [], disputes: [] });
  const [dbLoading, setDbLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Memoize handleSignOut so it maintains stable reference across renders
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, [signOut]);

  const fetchAll = useCallback(async (forceRefresh = false) => {
    setDbLoading(true);
    setIsFetching(true);
    console.log('[DB] 🔄 Fetching data from MongoDB...');

    try {
      // Fetch all data from MongoDB via API route
      const res = await fetch('/api/data');
      const data = await res.json();
      
      if (!res.ok) {
        console.error('[DB] ❌ API fetch failed:', data.error);
        setDbConnected(false);
        setDb({ requests: [], offers: [], escrow: [], disputes: [] });
      } else {
        console.log('[DB] ✓ Data fetched successfully');
        console.log('[DB] Requests:', data.requests?.length || 0);
        console.log('[DB] Offers:', data.offers?.length || 0);
        console.log('[DB] Escrow:', data.escrow?.length || 0);
        console.log('[DB] Disputes:', data.disputes?.length || 0);
        
        setDb(data || { requests: [], offers: [], escrow: [], disputes: [] });
        setDbConnected(true);
        console.log('[DB] ✅ Fetch complete. Status: 🟢 MongoDB Connected');
      }
    } catch (error) {
      console.error('[DB] ❌ Fatal fetch error:', error?.message);
      console.error('[DB] Stack:', error?.stack);
      setDbConnected(false);
      setDb({ requests: [], offers: [], escrow: [], disputes: [] });
    } finally {
      setDbLoading(false);
      setIsFetching(false);
    }
  }, []); // Stable reference

  // Reset tab when role changes (after login) - WAIT FOR AUTH FIRST
  useEffect(() => {
    // Wait for auth to be ready (not still loading)
    if (authLoading) {
      console.log('[DB] ⏳ Auth still loading...');
      return;
    }

    // Only fetch if user is logged in
    if (!user?.id) {
      console.log('[DB] 🔐 No user, skipping fetch');
      return;
    }

    if (role) {
      console.log('[DB] 📍 Auth ready - initial fetch on role change');
      setActiveTab(getDefaultTab(role));
      fetchAll(false);
    }
  }, [user?.id, role, authLoading]); // Include authLoading in deps

  const handleTab = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  // ── Auth loading ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-[#185FA5] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated → show auth screen ──────────────────────────
  if (!user) return <AuthScreen />;

  // ── Authenticated → show role-based app ──────────────────────────
  const navSections = getNavSections(role);

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col text-[#1a1a2e]">

      {/* ── Topbar ─────────────────────────────────────── */}
      <nav className="h-14 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-50">

        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-btn"
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} className="text-gray-600" /> : <Menu size={20} className="text-gray-600" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#185FA5] rounded-lg flex items-center justify-center shadow-sm">
              <Wallet size={14} className="text-white" />
            </div>
            <span className="font-bold text-[#185FA5] text-lg leading-none">
              Offer<span className="text-gray-400 font-normal">Bridge</span>
            </span>
          </div>
        </div>

        {/* Right: DB status + user menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAll(true)}
            disabled={isFetching}
            className="hidden sm:flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-full font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
          >
            <svg className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className={`hidden sm:flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium ${dbConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
            <Database size={10} />
            {dbConnected ? 'Live DB' : 'Mock Data'}
          </div>
          <UserMenu displayName={displayName} role={role} onSignOut={handleSignOut} />
        </div>
      </nav>

      <div className="flex flex-1 relative overflow-hidden">

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* ── Sidebar ──────────────────────────────────── */}
        <aside className={`
          fixed md:static top-14 left-0 bottom-0 z-40
          w-56 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col
          transform transition-transform duration-200 ease-out
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Nav sections */}
          <div className="p-4 flex-1 overflow-y-auto space-y-5">
            {navSections.map(({ label, items }) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 px-2 font-semibold">{label}</p>
                <nav className="space-y-0.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => handleTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all ${activeTab === item.id
                        ? 'bg-[#E6F1FB] text-[#185FA5] font-semibold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                    >
                      <span className={activeTab === item.id ? 'text-[#185FA5]' : 'text-gray-400'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          {/* Sidebar footer — user info */}
          <div className="p-4 border-t border-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#E6F1FB] rounded-full flex items-center justify-center shrink-0">
                <User size={14} className="text-[#185FA5]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-700 truncate">{displayName}</p>
                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABELS[role] ?? role}
                </span>
              </div>
              <button
                id="sidebar-signout"
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-[calc(100vh-56px)]">
          {dbLoading && !db.requests.length ? (
            <SkeletonDashboard />
          ) : (
            <div className="animate-fade-in">
              {renderContent(role, activeTab, db, fetchAll, user)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}