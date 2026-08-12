import { NextResponse } from "next/server";
import { EMAIL_TEMPLATES, buildEmailPreview } from "@/lib/emailPreview";
import { withAdmin, ApiError } from "@/lib/apiHandler";

export const GET = withAdmin<{ id: string }>(
  "GET /api/admin/emails/[id]",
  async ({ params: { id } }) => {
    if (!EMAIL_TEMPLATES.some((t) => t.id === id)) {
      throw new ApiError("unknown_template", 404);
    }

    const preview = await buildEmailPreview(id);
    return NextResponse.json(preview);
  }
);
