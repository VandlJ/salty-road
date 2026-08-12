import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAdmin } from "@/lib/apiHandler";

export const PATCH = withAdmin<{ id: string }>(
  "PATCH /api/admin/contact-messages/[id]",
  async ({ req, params: { id } }) => {
  const { read } = await req.json();

  const message = await prisma.contactMessage.update({
    where: { id },
    data: { read: !!read },
  });

  return NextResponse.json(message);
  }
);

export const DELETE = withAdmin<{ id: string }>(
  "DELETE /api/admin/contact-messages/[id]",
  async ({ params: { id } }) => {
  await prisma.contactMessage.delete({ where: { id } });
  return NextResponse.json({ success: true });
  }
);
