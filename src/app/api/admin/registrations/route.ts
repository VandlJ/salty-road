import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendAcceptanceEmail, sendRejectionEmail } from "@/lib/email";
import { generateSPD, generateQRCodeBase64 } from "@/lib/qr";
import { PAYMENT_STATUS, isOneOf } from "@/lib/constants";
import { requireCurrentEdition } from "@/lib/edition";
import { withAdmin } from "@/lib/apiHandler";

export const GET = withAdmin("GET /api/admin/registrations", async () => {
    // Scoped to the current edition so the list doesn't accumulate every
    // past year's exhibitors. Past editions are reviewed on their archive
    // page, not here.
    const edition = await requireCurrentEdition();

    const regs = await prisma.registration.findMany({
      where: { editionId: edition.id },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" }
      ]
    });
    return NextResponse.json(regs);
  }
);

export const PATCH = withAdmin("PATCH /api/admin/registrations", async ({ req }) => {
    const body = await req.json();
    const { id, action } = body;

    if (!id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    if (action === "accept" || action === "decline" || action === "pending") {
      let status = "pending";
      if (action === "accept") status = "accepted";
      if (action === "decline") status = "declined";

      // Fetch registration first to get details for email
      const reg = await prisma.registration.findUnique({
        where: { id },
        include: { edition: true },
      });
      if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

      // Send emails only if status is changing to accept or decline
      if (action === "accept" && reg.status !== "accepted") {
        const spd = generateSPD({
          // Was hard-coded at 299 — the fee belongs to the edition, and the
          // QR must bill whatever that edition actually charges.
          amount: reg.edition.registrationFee / 100,
          message: `SaltyRoad ${reg.brand} ${reg.model} ${reg.lastName}`,
        });
        const qrCodeBase64 = await generateQRCodeBase64(spd);
        await sendAcceptanceEmail(reg.email, qrCodeBase64);
      } else if (action === "decline" && reg.status !== "declined") {
        await sendRejectionEmail(reg.email);
      }

      const updated = await prisma.registration.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ success: true, updated });
    }

    if (action === "updatePaymentStatus") {
      const { paymentStatus } = body;
      if (!isOneOf(PAYMENT_STATUS, paymentStatus)) {
        return NextResponse.json({ error: "invalid_payment_status" }, { status: 400 });
      }
      const updated = await prisma.registration.update({
        where: { id },
        data: { paymentStatus },
      });
      return NextResponse.json({ success: true, updated });
    }

    if (action === "reorder") {
      const { direction } = body;
      const current = await prisma.registration.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

      // Ordering is per-edition — the neighbour to swap with, and the
      // renumber fallback, must both stay inside this registration's own
      // edition or the two years' orderings would interleave.
      const other = await prisma.registration.findFirst({
        where: {
          editionId: current.editionId,
          order: direction === "up" ? { lt: current.order } : { gt: current.order }
        },
        orderBy: { order: direction === "up" ? "desc" : "asc" }
      });

      if (other) {
        const currentOrder = current.order;
        await prisma.$transaction([
          prisma.registration.update({ where: { id: current.id }, data: { order: other.order } }),
          prisma.registration.update({ where: { id: other.id }, data: { order: currentOrder } })
        ]);
      } else {
        // No neighbour means `order` was never initialised — assign a stable
        // sequence. Wrapped in a transaction so a partial failure can't leave
        // the list half-renumbered.
        const all = await prisma.registration.findMany({
          where: { editionId: current.editionId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        await prisma.$transaction(
          all.map((reg, i) =>
            prisma.registration.update({ where: { id: reg.id }, data: { order: i } })
          )
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "updatePhotos") {
      const { photos } = body;
      if (!Array.isArray(photos)) return NextResponse.json({ error: "Invalid photos" }, { status: 400 });
      const updated = await prisma.registration.update({
        where: { id },
        data: { photos },
      });
      return NextResponse.json({ success: true, updated });
    }

    if (action === "updateDescription") {
      const { description } = body;
      if (typeof description !== "string") return NextResponse.json({ error: "Invalid description" }, { status: 400 });
      const updated = await prisma.registration.update({
        where: { id },
        data: { description },
      });
      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
);

export const DELETE = withAdmin("DELETE /api/admin/registrations", async ({ req }) => {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    await prisma.registration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }
);