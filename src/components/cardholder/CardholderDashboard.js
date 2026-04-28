"use client";
import { motion } from 'framer-motion';
import { DollarSign, Star, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';

const STATUS_STYLES = {
  pending:   'badge badge-warning',
  matched:   'badge badge-info',
  completed: 'badge badge-success',
};

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function CardholderDashboard({ offers: offersProp, requests: reqsProp }) {
  const myOffers     = offersProp || [];
  const allReqs      = reqsProp  || [];
  const matchedReqs  = allReqs.filter(r => r.status === 'matched');
  const completedReqs= allReqs.filter(r => r.status === 'completed');
  const totalEarned  = completedReqs.reduce((sum, r) => sum + r.amount * 0.02, 0);
  const pendingEarned= matchedReqs.reduce((sum, r)  => sum + r.amount * 0.02, 0);

  const stats = [
    { label: 'Active Offers',    value: myOffers.length,                          sub: 'listed cards',          icon: Star,       iconClass: 'stat-warning', delay: 0 },
    { label: 'Matched Deals',    value: matchedReqs.length,                       sub: 'in progress',           icon: Clock,      iconClass: 'stat-info',    delay: 0.08 },
    { label: 'Total Earned',     value: `₹${totalEarned.toLocaleString('en-IN')}`,sub: 'from completed deals',  icon: DollarSign, iconClass: 'stat-success', delay: 0.16 },
    { label: 'Pending Earnings', value: `₹${pendingEarned.toLocaleString('en-IN')}`,sub: 'in active deals',   icon: TrendingUp, iconClass: 'stat-purple',  delay: 0.24 },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Cardholder Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Monetise your credit card offers by helping buyers</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="visible" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Active Offers */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>My Active Offers</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Your listed cards visible to buyers</p>
        </div>
        <div>
          {myOffers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No offers listed yet.</p>
            </div>
          ) : myOffers.map((offer, i) => (
            <motion.div key={offer.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="px-5 py-4 flex items-center gap-4 transition"
              style={{ borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-h) 100%)', boxShadow: '0 4px 12px var(--primary-glow)' }}>
                {offer.bank?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{offer.card_name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{(offer.categories ?? []).join(' · ')}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{offer.discount}% off</p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>+{offer.cashback}% cashback</p>
              </div>
              <span className="badge badge-success shrink-0 capitalize">{offer.status}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Recent Activity</h2>
        </div>
        <div>
          {allReqs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>No recent activity.</p>
            </div>
          ) : allReqs.slice(0, 4).map((req, i) => (
            <motion.div key={req.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
              className="px-5 py-3.5 flex items-center gap-4 transition"
              style={{ borderBottom: '1px solid var(--border2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <CheckCircle2 size={16} style={{ color: req.status === 'completed' ? '#10b981' : 'var(--border)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{req.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{req.category}</p>
              </div>
              <p className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--text)' }}>₹{req.amount.toLocaleString('en-IN')}</p>
              <span className={STATUS_STYLES[req.status] || 'badge badge-neutral'}>{req.status}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
