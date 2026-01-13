import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  try {
    // parse multipart/form-data
    const form = await req.formData();

    const firstName = form.get("firstName")?.toString() ?? "";
    const lastName = form.get("lastName")?.toString() ?? "";
    const email = form.get("email")?.toString() ?? "";
    const brand = form.get("brand")?.toString() ?? "";
    const model = form.get("model")?.toString() ?? "";
    const year = form.get("year")?.toString() ?? "";
    const description = form.get("description")?.toString() ?? "";
    const instagram = form.get("instagram")?.toString() ?? null;

    if (!firstName || !lastName || !email || !brand || !model || !year || !description) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    // collect files from the form: may be zero or many
    const fileEntries = form.getAll("photos") || [];
    const uploadedUrls: string[] = [];

    for (const entry of fileEntries) {
      // each entry is a File/Blob (web File). Convert to Buffer for @vercel/blob
      // @vercel/blob accepts Bytes/Buffer/Blob — Buffer is safest on node runtime
      // entry may not be a File in some cases; guard it
      const file = entry as File | undefined;
      if (!file || typeof file.name !== "string") continue;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const now = Date.now();
      // path inside your Vercel Blob container
      const remotePath = `registrations/${now}_${file.name.replace(/\s+/g, "_")}`;
      const { url } = await put(remotePath, buffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: file.type || "application/octet-stream",
      });
      uploadedUrls.push(url);
    }

    const record = await prisma.registration.create({
      data: {
        firstName,
        lastName,
        email,
        brand,
        model,
        year,
        description,
        instagram: instagram || null,
        photos: uploadedUrls,
      },
    });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}