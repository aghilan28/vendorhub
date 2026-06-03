import { NextResponse } from "next/server";
import { listLiveCategories } from "@/lib/api/queries/categories";

export async function GET() {
  try {
    const categories = await listLiveCategories();
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
