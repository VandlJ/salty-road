import Skeleton from "@/components/skeleton";

export default function ShopLoading() {
  return (
    <section className="flex-1 bg-black text-white px-4 pt-4 md:pt-6 pb-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-4 md:mb-6 gap-2 text-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-sm border border-gray-800 overflow-hidden">
              <Skeleton className="aspect-[4/5] w-full rounded-none" />
              <div className="p-3 sm:p-4 flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
