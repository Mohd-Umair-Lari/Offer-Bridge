"use client";
import { motion } from 'framer-motion';

export function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-3/4" />
          <div className="skeleton h-2.5 w-1/2" />
        </div>
      </div>
      <div className="skeleton h-7 w-1/3 mb-1" />
      <div className="skeleton h-2.5 w-1/2" />
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid var(--border2)' }}>
      <div className="skeleton w-16 h-5 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3.5 w-2/3" />
        <div className="skeleton h-2.5 w-1/3" />
      </div>
      <div className="skeleton h-4 w-20" />
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-4 w-72" />
      </div>
      {/* Stat cards */}
      <SkeletonGrid count={4} />
      {/* Table card */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton h-4 w-36" />
        </div>
        {Array(4).fill(0).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </motion.div>
  );
}
