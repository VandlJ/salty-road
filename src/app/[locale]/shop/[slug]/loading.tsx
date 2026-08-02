import Skeleton from "@/components/skeleton";

export default function ProductDetailLoading() {
  return (
    <section className="flex-1 w-full bg-black text-white px-4 pt-6 md:pt-10 pb-12">
      <div className="max-w-5xl mx-auto" aria-hidden="true">
        <Skeleton className="h-4 w-24 mb-8" />
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
