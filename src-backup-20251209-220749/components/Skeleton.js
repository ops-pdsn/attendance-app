'use client'

// Skeleton for stat cards (dashboard)
export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// Skeleton for calendar
export function SkeletonCalendar() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// Skeleton for day details panel
export function SkeletonDayDetails() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse">
      <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4" />
      <div className="mb-6">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Full page loading skeleton for dashboard
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-4 sm:p-6 mb-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
              <div>
                <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="mb-6">
          <SkeletonStats />
        </div>
        
        {/* Main Content Skeleton */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonCalendar />
          </div>
          <div>
            <SkeletonDayDetails />
          </div>
        </div>
      </div>
    </div>
  )
}