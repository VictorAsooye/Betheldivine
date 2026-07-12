interface PageSkeletonProps {
  variant?: "dashboard" | "list" | "form" | "cards";
}

export default function PageSkeleton({ variant = "list" }: PageSkeletonProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper2">
      {/* TopNav placeholder */}
      <div className="bg-paper border-b border-line2 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="h-[30px] w-40 bg-line rounded animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-line animate-pulse" />
        </div>
        <div className="hidden md:flex items-center gap-4 px-6 pb-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 w-16 bg-line rounded animate-pulse" />)}
        </div>
        <div className="px-6 py-4 border-t border-line">
          <div className="h-6 w-48 bg-line rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {variant === "dashboard" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-line rounded-xl animate-pulse" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <div key={i} className="h-48 bg-line rounded-xl animate-pulse" />)}
            </div>
            <div className="h-40 bg-line rounded-xl animate-pulse" />
          </>
        )}
        {variant === "cards" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-28 bg-line rounded-xl animate-pulse" />)}
          </div>
        )}
        {variant === "form" && (
          <>
            <div className="h-32 bg-line rounded-xl animate-pulse" />
            <div className="h-16 bg-line rounded-xl animate-pulse" />
            <div className="h-16 bg-line rounded-xl animate-pulse" />
          </>
        )}
        {variant === "list" && (
          <>
            <div className="h-10 bg-line rounded-lg animate-pulse w-1/3" />
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-line rounded-xl animate-pulse" />)}
          </>
        )}
      </div>
    </div>
  );
}
