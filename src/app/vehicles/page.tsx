import React from "react";
import prisma from "@/lib/prisma";

export default async function VehiclesPage() {
  const regs = await prisma.registration.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Registered Vehicles</h1>
      <div className="grid gap-6">
        {regs.map((r) => (
          <div key={r.id} className="p-4 border rounded">
            <div className="mb-2 font-semibold">{r.name} — {r.car} ({r.plate})</div>
            <div className="text-sm text-gray-600 mb-2">Status: {r.status || "pending"}</div>
            <div className="mb-3">{r.description}</div>

            {r.photos && r.photos.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {r.photos.map((p, i) => (
                  <img key={i} src={p} alt={`photo-${i}`} className="w-40 h-28 object-cover border" />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No photos uploaded</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}