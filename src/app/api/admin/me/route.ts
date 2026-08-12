import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/apiHandler";

// Session probe for the client-side admin gate — the 401 from withAdmin is
// the whole answer, so a logged-in caller just gets an acknowledgement.
export const GET = withAdmin("GET /api/admin/me", async () =>
  NextResponse.json({ ok: true })
);
