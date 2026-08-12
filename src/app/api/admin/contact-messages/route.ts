import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAdmin } from "@/lib/apiHandler";

export const GET = withAdmin(
  "GET /api/admin/contact-messages",
  async () => {
      const messages = await prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(messages);
  }
);
