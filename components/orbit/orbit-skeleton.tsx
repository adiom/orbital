"use client";

export function OrbitSkeleton() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/50 to-purple-50/50">
      {/* Header Skeleton */}
      <header className="border-gray-200/50 border-b bg-white/80 px-8 py-6 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 h-9 w-64 animate-pulse rounded-lg bg-gradient-to-r from-gray-200 to-gray-300" />
            <div className="mt-2 flex items-center gap-4">
              <div className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="h-12 w-36 animate-pulse rounded-full bg-gradient-to-r from-gray-200 to-gray-300" />
        </div>
      </header>

      {/* Graph Skeleton */}
      <div className="relative flex-1 p-8">
        {/* Simulated orbit cards */}
        <div className="flex h-full items-center justify-center gap-8">
          {[...Array(6)].map((_, i) => (
            <div
              className="h-32 w-44 animate-pulse rounded-3xl border-2 border-gray-200 bg-white shadow-lg"
              key={i}
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="p-4">
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
            <p className="text-gray-600 text-sm">Loading orbits...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
