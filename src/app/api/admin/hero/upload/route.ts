import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdminFromReq } from "@/lib/adminAuth";
import { logError } from "@/lib/logError";

// Client uploads, unlike the rest of the site's uploads (/api/upload), which
// stream the file through the function.
//
// The reason is the 4.5MB body limit Vercel enforces on function invocations:
// a 1080p rendition of a longer loop goes past it, and the failure mode is a
// bare platform error the route's own error handling never sees. Here the
// browser uploads straight to Blob storage and this route only mints a
// short-lived, path-scoped token.
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // This is the only authorisation point — the token it returns lets
        // the holder write to Blob storage directly, so the admin check has
        // to happen here rather than at the later onUploadCompleted callback
        // (which is invoked by Vercel, not by the browser).
        const admin = await getAdminFromReq();
        if (!admin) throw new Error("unauthorized");

        // Scoped to the folder this feature owns, so a stolen token can't be
        // used to overwrite gallery photos or product images.
        if (!pathname.startsWith("hero/")) throw new Error("forbidden_path");

        return {
          allowedContentTypes: ["video/mp4", "image/webp"],
          maximumSizeInBytes: 25 * 1024 * 1024,
          // Blob appends a random suffix by default; keeping it means a new
          // clip never silently replaces the one the live site is serving,
          // and an old URL keeps working until cleanup removes it.
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do: the browser sends the resulting URLs to
        // PUT /api/admin/hero itself, and only that route decides what the
        // homepage points at. A blob existing is not the same as it being
        // published.
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload_failed";
    if (message === "unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (message === "forbidden_path") {
      return NextResponse.json({ error: "forbidden_path" }, { status: 403 });
    }
    logError("api:admin/hero/upload", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 400 });
  }
}
