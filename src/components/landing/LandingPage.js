"use client";
import { motion } from 'framer-motion';
import {
  Wallet, ArrowRight, ShieldCheck, Zap, TrendingUp, Star,
  CreditCard, Users, Lock, ChevronRight, BarChart2, Globe,
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.10 } } };

const FEATURES = [
  { icon: ShieldCheck, title: 'Secure Escrow',       desc: 'Every transaction is protected. Funds are held safely until both parties confirm delivery.',         color: '#10b981' },
  { icon: Zap,         title: 'Instant Matching',    desc: 'Our smart algorithm pairs buyers with the best available card offers in seconds.',                    color: '#f59e0b' },
  { icon: TrendingUp,  title: 'Real Earnings',       desc: 'Cardholders earn commissions on every successful deal. Your unused offers make money.',               color: '#3b82f6' },
  { icon: Lock,        title: 'Verified Providers',  desc: 'Every cardholder is verified. Browse with confidence knowing offers are genuine.',                    color: '#ef4444' },
  { icon: BarChart2,   title: 'Real-time Analytics', desc: 'Track volume, earnings, and deal performance with live dashboards.',                                  color: '#06b6d4' },
  { icon: Globe,       title: 'Open Marketplace',    desc: 'Browse hundreds of card offers across all major banks and categories.',                               color: '#a855f7' },
];

const STEPS = [
  { step: '01', title: 'Create Account',  desc: 'Sign up as a Buyer, Provider, or both. It takes 30 seconds.', icon: Users },
  { step: '02', title: 'Post or Browse',  desc: 'Buyers post what they need. Providers list their card offers.', icon: CreditCard },
  { step: '03', title: 'Deal & Earn',     desc: 'Match, transact through escrow, and both sides win.',          icon: TrendingUp },
];

const STATS = [
  { value: '10K+',  label: 'Active Users' },
  { value: '₹5Cr+', label: 'Volume Traded' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★',  label: 'User Rating' },
];

const TESTIMONIALS = [
  { name: 'Arjun M.', role: 'Buyer',    text: 'Saved ₹12,000 on my first purchase. The escrow system gave me complete peace of mind.', avatar: 'A' },
  { name: 'Priya S.', role: 'Provider', text: 'I earn ₹5,000+ monthly just by listing my unused card offers. Incredible platform.', avatar: 'P' },
  { name: 'Rahul K.', role: 'Prosumer', text: 'As both buyer and provider, I get the full picture. The dashboard is incredibly clean.', avatar: 'R' },
];

function NavBar({ onGetStarted }) {
  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary)', color: 'var(--bg)' }}
          >
            <Wallet size={15} />
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text)' }}>
            Offer<span style={{ color: 'var(--text-muted)' }}>Bridges</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {['Features', 'How It Works', 'Testimonials'].map(l => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.target.style.color = 'var(--text)')}
              onMouseLeave={e => (e.target.style.color = 'var(--text-muted)')}
            >
              {l}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="btn-ghost text-xs px-4 py-2"
          >
            Sign In
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="btn-primary text-xs px-4 py-2"
          >
            Get Started <ArrowRight size={13} />
          </motion.button>
        </div>
      </div>
    </nav>
  );
}

function SectionLabel({ children }) {
  return (
    <p
      className="text-xs font-bold tracking-[0.15em] uppercase mb-3"
      style={{ color: 'var(--text-dim)' }}
    >
      {children}
    </p>
  );
}

export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <NavBar onGetStarted={onGetStarted} />

      <section className="relative overflow-hidden py-28 md:py-40">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            opacity: 0.04,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, transparent 0%, var(--bg) 100%)',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 text-[11px] font-semibold border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#10b981' }}
              />
              Join 10,000+ users already saving
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.55 }}
              className="text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-6"
              style={{ color: 'var(--text)' }}
            >
              Unlock&nbsp;
              <span className="gradient-text">Exclusive</span>
              <br />
              Card&nbsp;Benefits
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.55 }}
              className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              OfferBridges connects buyers seeking credit card discounts with
              verified cardholders. Save money. Earn rewards.
              <br className="hidden md:block" />
              Every deal is escrow-protected.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.45 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={onGetStarted}
                className="btn-primary text-sm px-8 py-3.5 justify-center"
              >
                Get Started <ArrowRight size={16} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-ghost text-sm px-8 py-3.5 justify-center"
              >
                See How It Works <ChevronRight size={14} />
              </motion.button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto"
          >
            {STATS.map(s => (
              <div
                key={s.label}
                className="p-4 rounded-2xl text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section
        id="features"
        className="py-24"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-14"
          >
            <SectionLabel>Features</SectionLabel>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold mb-4" style={{ color: 'var(--text)' }}>
              Everything you need to&nbsp;
              <span className="gradient-text">trade smarter</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-sm max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
              Built for security, speed, and simplicity. OfferBridges handles the complexity
              so you can focus on deals.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  transition={{ duration: 0.35 }}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  className="card card-hover p-5 cursor-default group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${f.color}14`, border: `1px solid ${f.color}22` }}
                  >
                    <Icon size={18} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--text)' }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="py-24" style={{ background: 'var(--bg)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-14"
          >
            <SectionLabel>How It Works</SectionLabel>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold" style={{ color: 'var(--text)' }}>
              Three steps to&nbsp;
              <span className="gradient-text">start saving</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.step} variants={fadeUp} className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <Icon size={24} style={{ color: 'var(--text)' }} />
                    </div>
                    <span
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: 'var(--primary)',
                        color: 'var(--bg)',
                        border: '2px solid var(--bg)',
                      }}
                    >
                      {s.step}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div
                        className="absolute top-7 left-full hidden md:block w-full"
                        style={{
                          width: 'calc(100% + 2rem)',
                          height: '1px',
                          background: 'var(--border)',
                          left: '100%',
                          marginLeft: '1rem',
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>{s.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section
        id="testimonials"
        className="py-24"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-14"
          >
            <SectionLabel>Testimonials</SectionLabel>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold" style={{ color: 'var(--text)' }}>
              Loved by&nbsp;
              <span className="gradient-text">thousands</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-5"
          >
            {TESTIMONIALS.map(t => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                className="card p-5 cursor-default flex flex-col gap-4"
              >
                <div className="flex items-center gap-0.5">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} size={12} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                  ))}
                </div>
                <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--primary)', color: 'var(--bg)' }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{t.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-28 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 60% at 50% 50%, var(--surface) 0%, transparent 70%)',
            opacity: 0.6,
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <SectionLabel>Ready to Start?</SectionLabel>
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-5xl font-bold mb-5"
              style={{ color: 'var(--text)' }}
            >
              Start&nbsp;
              <span className="gradient-text">saving</span>
              &nbsp;today.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-sm mb-8"
              style={{ color: 'var(--text-muted)' }}
            >
              Join thousands of users already trading smarter on OfferBridges.
              No credit card required to sign up.
            </motion.p>
            <motion.button
              variants={fadeUp}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="btn-primary text-sm px-10 py-3.5 mx-auto justify-center"
            >
              Create Free Account <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--primary)', color: 'var(--bg)' }}
            >
              <Wallet size={13} />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              Offer<span style={{ color: 'var(--text-muted)' }}>Bridges</span>
            </span>
          </div>

          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            © {new Date().getFullYear()} OfferBridges. All rights reserved.
          </p>

          <div className="flex gap-5">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a
                key={l}
                href="#"
                className="text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.target.style.color = 'var(--text)')}
                onMouseLeave={e => (e.target.style.color = 'var(--text-muted)')}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
