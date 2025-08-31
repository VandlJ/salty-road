import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, mobile, car, plate, description, instagram, photos } =
      body ?? {};

    if (
      !name ||
      !email ||
      !mobile ||
      !car ||
      !plate ||
      !description ||
      typeof name !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 }
      );
    }

    const record = await prisma.registration.create({
      data: {
        name,
        email,
        mobile,
        car,
        plate,
        description,
        instagram: instagram || null,
        photos: Array.isArray(photos) ? photos : [],
      },
    });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}