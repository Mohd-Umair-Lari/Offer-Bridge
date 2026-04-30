"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShieldCheck, Truck, RefreshCw, Info, CreditCard, AlertCircle, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';

const TYPE_META = {
  payment:  { icon: CreditCard,   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  tracking: { icon: Truck,        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  refund:   { icon: RefreshCw,    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  action:   { icon: AlertCircle,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  info:     { icon: Info,         color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s  = Math.floor(diff / 1000);
  const m  = Math.floor(s / 60);
  const h  = Math.floor(m / 60);
  const d  = Math.floor(h / 24);
  if (d  > 0) return `${d}d ago`;
  if (h  > 0) return `${h}h ago`;
  if (m  > 0) return `${m}m ago`;
  return 'just now';
}

// Accept optional onPaymentAction / onTrackingAction callbacks so parent can open modals
export default function NotificationBell({ onPaymentAction, onTrackingAction }) {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await api.getNotifications(25);
      setNotifs(res.data || []);
      setUnread(res.unread || 0);
    } catch {
      // silently fail — user may not be logged in yet
    }
  }, []);

  // Poll every 30 seconds for real-time feel
  useEffect(() => {
    fetchNotifs();
    intervalRef.current = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifs]);

  const markRead = useCallback(async (id) => {
    try {
      await api.markNotifRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  }, []);

  const handleNotifClick = (n) => {
    if (!n.read) markRead(n.id);
    if (n.type === 'payment' && n.tx_id && onPaymentAction) {
      setOpen(false);
      onPaymentAction(n.tx_id);
    }
    if ((n.type === 'action') && n.tx_id && onTrackingAction) {
      setOpen(false);
      onTrackingAction(n.tx_id);
    }
  };

  return (
    <div className="relative">
      <motion.button
        id="notification-bell-btn"
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifs(); }}
        className="w-9 h-9 rounded-xl flex items-center justify-center relative"
        style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
        <Bell size={16} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: 'var(--primary)' }}>
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              id="notification-panel"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border2)', background: 'var(--surface2)' }}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Notifications</p>
                  {unread > 0 && (
                    <span className="badge badge-purple text-[10px]">{unread} new</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <motion.button onClick={fetchNotifs} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="p-1 rounded-lg transition" style={{ color: 'var(--text-dim)' }}
                    title="Refresh">
                    <RefreshCw size={12} />
                  </motion.button>
                  {unread > 0 && (
                    <motion.button onClick={markAllRead} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition"
                      style={{ color: 'var(--primary)', background: 'var(--primary-dim)' }}>
                      <CheckCheck size={11} /> Mark all read
                    </motion.button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>No notifications yet</p>
                  </div>
                ) : notifs.map(n => {
                  const meta = TYPE_META[n.type] || TYPE_META.info;
                  const Icon = meta.icon;
                  const isClickable = (n.type === 'payment' && onPaymentAction) || (n.type === 'action' && onTrackingAction);
                  return (
                    <div
                      key={n.id}
                      id={`notif-${n.id}`}
                      onClick={() => handleNotifClick(n)}
                      className="px-4 py-3 flex gap-3 items-start transition"
                      style={{
                        borderBottom: '1px solid var(--border2)',
                        background: !n.read ? 'var(--primary-dim)' : 'transparent',
                        cursor: isClickable ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = !n.read ? 'var(--primary-dim)' : 'transparent'}>

                      <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}>
                        <Icon size={13} style={{ color: meta.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text)' }}>{n.title}</p>
                        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{timeAgo(n.createdAt)}</p>
                          {isClickable && (
                            <span className="text-[10px] font-semibold" style={{ color: meta.color }}>
                              {n.type === 'payment' ? 'Tap to pay →' : 'Tap to submit →'}
                            </span>
                          )}
                        </div>
                      </div>

                      {!n.read && (
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: meta.color }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
