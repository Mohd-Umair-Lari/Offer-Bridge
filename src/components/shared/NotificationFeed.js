"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Truck, RefreshCw, Info, CreditCard, AlertCircle, CheckCheck } from 'lucide-react';
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

export default function NotificationFeed({ onPaymentAction, onTrackingAction, condensed = false }) {
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const intervalRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await api.getNotifications(25);
      setNotifs(res.data || []);
      setUnread(res.unread || 0);
    } catch {
      // silently fail
    }
  }, []);

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
      onPaymentAction(n.tx_id);
    }
    if ((n.type === 'action') && n.tx_id && onTrackingAction) {
      onTrackingAction(n.tx_id);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border2)', background: 'var(--surface2)' }}>
        <div className="flex items-center gap-2">
          <Bell size={16} style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Recent Activity</p>
          {unread > 0 && <span className="badge badge-purple text-[10px]">{unread} new</span>}
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
      <div className={`${condensed ? 'max-h-[300px]' : 'max-h-[400px]'} overflow-y-auto scrollbar-hide p-2`}>
        <AnimatePresence>
          {notifs.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-10 text-center">
              <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>No recent activity to show</p>
            </motion.div>
          ) : notifs.map((n, i) => {
            const meta = TYPE_META[n.type] || TYPE_META.info;
            const Icon = meta.icon;
            const isClickable = (n.type === 'payment' && onPaymentAction) || (n.type === 'action' && onTrackingAction);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className={`mb-2 last:mb-0 p-3 rounded-xl transition ${isClickable ? 'cursor-pointer hover:bg-white/5' : ''}`}
                style={{ background: n.read ? 'transparent' : 'rgba(139,92,246,0.04)', border: `1px solid ${n.read ? 'transparent' : 'rgba(139,92,246,0.1)'}` }}
                onClick={() => handleNotifClick(n)}
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5" style={{ background: meta.bg, color: meta.color }}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color: n.read ? 'var(--text)' : 'var(--text-bright)' }}>{n.title}</p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                    <p className="text-[10px] mt-2 font-medium" style={{ color: 'var(--text-dim)' }}>{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}