"use client";
import { useState } from 'react';
import { CreditCard, TrendingUp, Lock, Zap, ArrowRight, CheckCircle } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const features = [
    {
      icon: <CreditCard size={32} />,
      title: 'Buy Credit Card Offers',
      description: 'Browse verified credit card discounts from trusted cardholders and unlock exclusive offers',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: <TrendingUp size={32} />,
      title: 'Grow Your Income',
      description: 'Earn extra money by sharing your credit card benefits with buyers looking for great deals',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      icon: <Lock size={32} />,
      title: 'Safe & Secure',
      description: 'All transactions are protected with escrow and dispute resolution for peace of mind',
      gradient: 'from-green-500 to-green-600',
    },
  ];

  const steps = [
    { num: '1', title: 'Sign Up', desc: 'Create your account in seconds' },
    { num: '2', title: 'Choose Role', desc: 'Be a buyer, seller, or both' },
    { num: '3', title: 'Start Trading', desc: 'List offers or browse deals' },
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo/Title */}
            <div className="mb-6 inline-block">
              <div className="flex items-center gap-2 justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center">
                  <CreditCard size={28} className="text-slate-900" />
                </div>
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                  GoZivo
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Buy & Sell
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-300 bg-clip-text text-transparent">
                Credit Card Offers
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Connect with cardholders worldwide. Unlock exclusive discounts or earn extra income by sharing your benefits.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={onGetStarted}
                className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-semibold text-lg text-white hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border-2 border-gray-400 rounded-xl font-semibold text-lg text-white hover:bg-white/10 transition-all duration-300">
                Learn More
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                100% Secure Escrow
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                Verified Users Only
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                Instant Payouts
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 animate-bounce">
            <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center">
              <div className="w-1 h-2 bg-gray-400 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              Why Choose GoZivo?
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredFeature(idx)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20"
                >
                  {/* Gradient background on hover */}
                  {hoveredFeature === idx && (
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-10 -z-10`} />
                  )}

                  <div className={`inline-block p-3 rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-4 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>

                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{feature.description}</p>

                  <ArrowRight
                    size={20}
                    className={`absolute bottom-6 right-6 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all ${
                      hoveredFeature === idx ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8 md:gap-4">
              {steps.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Connecting line */}
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] right-[-50%] h-1 bg-gradient-to-r from-blue-500 to-transparent" />
                  )}

                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 text-3xl font-bold shadow-lg shadow-blue-500/40 hover:scale-110 transition-transform">
                      {step.num}
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-center">{step.title}</h3>
                    <p className="text-gray-400 text-center">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden p-12 md:p-16 bg-gradient-to-r from-blue-600/40 via-cyan-600/40 to-blue-600/40 border border-white/10 backdrop-blur-lg">
              {/* Animated background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl" />
              </div>

              <div className="relative z-10 text-center">
                <Zap size={40} className="mx-auto mb-4 text-yellow-300" />
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-200 mb-8 text-lg">
                  Join thousands of users making smarter financial moves with GoZivo.
                </p>

                <button
                  onClick={onGetStarted}
                  className="px-10 py-4 bg-white text-blue-600 font-bold text-lg rounded-xl hover:shadow-2xl hover:shadow-white/20 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                >
                  Create Account
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 px-4 md:px-6 text-center text-gray-400">
          <p>© 2026 GoZivo. All rights reserved. | Secure. Fast. Fair.</p>
        </footer>
      </div>
    </div>
  );
}
