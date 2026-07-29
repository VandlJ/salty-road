import type { Metadata } from "next";
import prisma from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.merchProduct.findUnique({
    where: { slug },
    select: { name: true, description: true, active: true },
  });

  if (!product || !product.active) {
    return { title: "Salty Road Shop" };
  }

  return {
    title: product.name,
    description: product.description,
  };
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
