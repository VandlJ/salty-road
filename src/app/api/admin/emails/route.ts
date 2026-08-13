import { NextResponse } from "next/server";
import { EMAIL_TEMPLATES } from "@/lib/emailPreview";
import { withAdmin } from "@/lib/apiHandler";

export const GET = withAdmin("GET /api/admin/emails", async () =>
  NextResponse.json(EMAIL_TEMPLATES)
);
