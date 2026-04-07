"use client";

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
      <SkeletonGrid count={2} />
    </div>
  );
}
