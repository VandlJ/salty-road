"use client";

import Skeleton from "@/components/skeleton";

export function MerchSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-[#111]/90 border border-gray-700 rounded-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-4 bg-white/5 border-b border-gray-700">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-16 w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
