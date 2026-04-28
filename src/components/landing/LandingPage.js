"use client";
import { motion } from 'framer-motion';
import { Wallet, ArrowRight, ShieldCheck, Zap, TrendingUp, Star, CreditCard, Users, Lock, ChevronRight, CheckCircle2, BarChart2, Globe } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

function Orb({ size, x, y, color, blur, cls }) {
  return (
    <div className={`absolute rounded-full pointer-events-none ${cls || ''}`}
      style={{ width: size, height: size, left: x, top: y,
        background: `radial-gradient(circle, ${color}50 0%, ${color}08 70%, transparent 100%)`,
        filter: `blur(${blur}px)` }} />
  );
}

const FEATURES = [
  { icon: ShieldCheck, title: 'Secure Escrow', desc: 'Every transaction is protected. Funds are held safely until both parties confirm delivery.', color: '#10b981' },
  { icon: Zap, title: 'Instant Matching', desc: 'Our smart algorithm pairs buyers with the best available card offers in seconds.', color: '#8b5cf6' },
  { icon: TrendingUp, title: 'Real Earnings', desc: 'Cardholders earn commissions on every successful deal. Your unused offers make money.', color: '#f59e0b' },
  { icon: Lock, title: 'Verified Providers', desc: 'Every cardholder is verified. Browse with confidence knowing offers are genuine.', color: '#3b82f6' },
  { icon: BarChart2, title: 'Live Analytics', desc: 'Track volume, earnings, and deal performance with real-time dashboards.', color: '#ec4899' },
  { icon: Globe, title: 'Open Marketplace', desc: 'Browse hundreds of card offers across all major banks and categories.', color: '#06b6d4' },
];

const PLANS = [
  { name: 'Free', price: '$0', period: '/mo', desc: 'Get started with basic features', features: ['5 requests/month', 'Public marketplace', 'Basic support', 'Email notifications'], cta: 'Get Started', popular: false },
  { name: 'Pro', price: '$19', period: '/mo', desc: 'For power users and frequent traders', features: ['Unlimited requests', 'Priority matching', 'Advanced analytics', 'Direct messaging', 'Dedicated support', 'Early access features'], cta: 'Start Pro Trial', popular: true },
  { name: 'Enterprise', price: '$49', period: '/mo', desc: 'For teams and businesses', features: ['Everything in Pro', 'Team management', 'Custom integrations', 'API access', 'White-label options', 'SLA guarantee'], cta: 'Contact Sales', popular: false },
];

const STATS = [
  { value: '10K+', label: 'Active Users' },
  { value: '$5M+', label: 'Volume Traded' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'User Rating' },
];

const TESTIMONIALS = [
  { name: 'Arjun M.', role: 'Buyer', text: 'Saved ₹12,000 on my first purchase. The escrow system gave me complete peace of mind.', avatar: 'A' },
  { name: 'Priya S.', role: 'Provider', text: 'I earn ₹5,000+ monthly just by listing my unused card offers. Incredible platform.', avatar: 'P' },
  { name: 'Rahul K.', role: 'Admin', text: 'The admin dashboard gives me full control. Dispute resolution is seamless.', avatar: 'R' },
];

export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', boxShadow: '0 2px 12px rgba(139,92,246,0.4)' }}>
              <Wallet size={17} className="text-white" />
            </div>
            <span className="font-bold text-xl"><span className="gradient-text">Go</span><span style={{ color: 'var(--text)' }}>Zivo</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium transition" style={{ color: 'var(--text-muted)' }}>Features</a>
            <a href="#pricing" className="text-sm font-medium transition" style={{ color: 'var(--text-muted)' }}>Pricing</a>
            <a href="#testimonials" className="text-sm font-medium transition" style={{ color: 'var(--text-muted)' }}>Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={onGetStarted} className="btn-ghost text-sm px-5 py-2">Sign In</motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={onGetStarted} className="btn-primary text-sm px-5 py-2">
              Get Started <ArrowRight size={14} />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <Orb size="500px" x="-10%" y="-20%" color="#8b5cf6" blur={120} cls="animate-float1" />
        <Orb size="350px" x="65%" y="10%" color="#7c3aed" blur={90} cls="animate-float2" />
        <Orb size="250px" x="30%" y="70%" color="#a855f7" blur={70} cls="animate-float1" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold"
              style={{ background: 'var(--primary-dim)', border: '1px solid rgba(139,92,246,0.25)', color: 'var(--primary)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} /> Now Live — Join 10,000+ users
            </motion.div>

            <motion.h1 variants={fadeUp} transition={{ duration: 0.6 }}
              className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              Unlock <span className="gradient-text">Exclusive</span><br />Card Benefits
            </motion.h1>

            <motion.p variants={fadeUp} transition={{ duration: 0.6 }}
              className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-muted)' }}>
              GoZivo connects buyers seeking credit card discounts with verified cardholders.<br className="hidden md:block" />
              Save money. Earn rewards. Every deal is escrow-protected.
            </motion.p>

            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={onGetStarted}
                className="btn-primary text-base px-8 py-3.5 justify-center" style={{ fontSize: '1rem' }}>
                Start Trading Free <ArrowRight size={18} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-ghost text-base px-8 py-3.5 justify-center">
                See How It Works <ChevronRight size={16} />
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Stats bar */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="p-4 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-2xl font-bold gradient-text">{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-sm font-semibold mb-3" style={{ color: 'var(--primary)' }}>FEATURES</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-4">Everything you need to <span className="gradient-text">trade smarter</span></motion.h2>
            <motion.p variants={fadeUp} className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Built for security, speed, and simplicity. GoZivo handles the complexity so you can focus on deals.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <motion.div key={f.title} variants={fadeUp} transition={{ duration: 0.4 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="card card-hover p-6 cursor-default">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                    <Icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-sm font-semibold mb-3" style={{ color: 'var(--primary)' }}>HOW IT WORKS</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold">Three steps to <span className="gradient-text">start saving</span></motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up as a Buyer, Provider, or both. It takes 30 seconds.', icon: Users },
              { step: '02', title: 'Post or Browse', desc: 'Buyers post what they need. Providers list their card offers.', icon: CreditCard },
              { step: '03', title: 'Deal & Earn', desc: 'Match, transact through escrow, and both sides win.', icon: TrendingUp },
            ].map(s => {
              const Icon = s.icon;
              return (
                <motion.div key={s.step} variants={fadeUp} className="text-center">
                  <div className="relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', boxShadow: '0 8px 30px rgba(139,92,246,0.35)' }}>
                    <Icon size={26} className="text-white" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'var(--bg)', border: '2px solid var(--primary)' }}>{s.step}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>{s.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-sm font-semibold mb-3" style={{ color: 'var(--primary)' }}>PRICING</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-4">Plans that <span className="gradient-text">scale with you</span></motion.h2>
            <motion.p variants={fadeUp} className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>Start free. Upgrade when you need more power.</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map(p => (
              <motion.div key={p.name} variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="rounded-3xl p-7 flex flex-col relative"
                style={{
                  background: p.popular ? 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(124,58,237,0.06) 100%)' : 'var(--surface)',
                  border: p.popular ? '2px solid rgba(139,92,246,0.4)' : '1px solid var(--border)',
                  boxShadow: p.popular ? '0 8px 40px rgba(139,92,246,0.2)' : 'var(--shadow-sm)',
                }}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge badge-purple px-4 py-1 text-xs">Most Popular</span>
                )}
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>{p.name}</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>{p.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold" style={{ color: 'var(--text)' }}>{p.price}</span>
                  <span className="text-sm" style={{ color: 'var(--text-dim)' }}>{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <CheckCircle2 size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />{f}
                    </li>
                  ))}
                </ul>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={onGetStarted}
                  className={p.popular ? 'btn-primary w-full justify-center py-3' : 'btn-ghost w-full justify-center py-3'}>
                  {p.cta}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section id="testimonials" className="py-24" style={{ background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-sm font-semibold mb-3" style={{ color: 'var(--primary)' }}>TESTIMONIALS</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold">Loved by <span className="gradient-text">thousands</span></motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TESTIMONIALS.map(t => (
              <motion.div key={t.name} variants={fadeUp} whileHover={{ y: -3 }}
                className="card p-6 cursor-default">
                <div className="flex items-center gap-1 mb-4">
                  {Array(5).fill(0).map((_, i) => <Star key={i} size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />)}
                </div>
                <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <Orb size="400px" x="10%" y="-30%" color="#8b5cf6" blur={100} cls="animate-float2" />
        <Orb size="300px" x="70%" y="20%" color="#7c3aed" blur={80} cls="animate-float1" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-5">
              Ready to start <span className="gradient-text">saving</span>?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-base mb-8" style={{ color: 'var(--text-muted)' }}>
              Join thousands of users already trading smarter on GoZivo. No credit card required.
            </motion.p>
            <motion.button variants={fadeUp} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="btn-primary text-base px-10 py-4 mx-auto justify-center" style={{ fontSize: '1rem' }}>
              Get Started Free <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Wallet size={14} className="text-white" />
            </div>
            <span className="font-bold text-lg"><span className="gradient-text">Go</span>Zivo</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>© {new Date().getFullYear()} GoZivo. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs transition" style={{ color: 'var(--text-muted)' }}>Privacy</a>
            <a href="#" className="text-xs transition" style={{ color: 'var(--text-muted)' }}>Terms</a>
            <a href="#" className="text-xs transition" style={{ color: 'var(--text-muted)' }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
