/**
 * Skeleton loaders — API se dynamic data aate waqt layout jaisa placeholder dikhate hain.
 * Usage:
 *   {isLoading ? <SkeletonTable rows={5} cols={4} /> : <RealTable />}
 */

interface SkeletonProps {
  className?: string;
}

// Base shimmer block (width / height className se)
export const Skeleton = ({ className = 'h-4 w-full' }: SkeletonProps) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} aria-hidden="true" />
);

// Text lines (last line chhoti)
export const SkeletonText = ({ lines = 3, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

// Dashboard KPI / stat cards
export const SkeletonStatCards = ({ count = 4, className = '' }: { count?: number; className?: string }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`} aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    ))}
  </div>
);

// Card list (applications, tickets, services grid)
export const SkeletonCards = ({ count = 3, className = '' }: { count?: number; className?: string }) => (
  <div className={`space-y-3 ${className}`} aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <SkeletonText lines={2} />
      </div>
    ))}
  </div>
);

// Grid tiles (service icons grid)
export const SkeletonGrid = ({ count = 8, className = '' }: { count?: number; className?: string }) => (
  <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`} aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

// Table body rows — <tbody> ke andar use karein
export const SkeletonTableRows = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} className="px-4 py-3">
            <Skeleton className={`h-4 ${c === 0 ? 'w-3/4' : 'w-1/2'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// Poora table placeholder (jab table structure bhi data ke baad render hota ho)
export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }: { rows?: number; cols?: number; className?: string }) => (
  <div className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${className}`} aria-busy="true">
    <div className="flex gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200">
      {Array.from({ length: cols }).map((_, c) => (
        <Skeleton key={c} className="h-3 flex-1" />
      ))}
    </div>
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? '' : 'opacity-70'}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
