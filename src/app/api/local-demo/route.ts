import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  normalizeLocalDemoData,
  seedLocalDemoData,
  type LocalDemoData,
  type LocalDemoPayload
} from "@/lib/local-demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// We store data in node_modules/.cache to avoid triggering 
// Next.js dev server's file watcher.
const dataDir = path.join(process.cwd(), "node_modules", ".cache", "tribig-board");
const dataFile = path.join(dataDir, "data.json");

async function ensureDataFile(): Promise<LocalDemoPayload> {
  try {
    const rawPayload = await readFile(dataFile, "utf8");
    const payload = JSON.parse(rawPayload) as LocalDemoPayload;

    if (!payload.updatedAt) {
      payload.updatedAt = new Date().toISOString();
      console.log("[Local API] Found data without updatedAt, fixing...");
      await writePayload(payload);
    }

    return {
      data: normalizeLocalDemoData(payload.data),
      updatedAt: payload.updatedAt
    };
  } catch {
    console.log("[Local API] Data file not found or invalid, seeding new data...");
    const payload = {
      data: seedLocalDemoData,
      updatedAt: new Date().toISOString()
    };

    await writePayload(payload);
    return payload;
  }
}

async function writePayload(payload: LocalDemoPayload) {
  try {
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`[Local API] Data saved to ${dataFile}`);
  } catch (error) {
    console.error("[Local API] Failed to save data:", error);
  }
}


export async function GET() {
  const payload = await ensureDataFile();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { data?: LocalDemoData };

  if (!body.data || !Array.isArray(body.data.clubs)) {
    return NextResponse.json({ error: "Invalid local demo data." }, { status: 400 });
  }

  const payload: LocalDemoPayload = {
    data: normalizeLocalDemoData(body.data),
    updatedAt: new Date().toISOString()
  };

  await writePayload(payload);
  return NextResponse.json(payload);
}

export async function DELETE() {
  const payload: LocalDemoPayload = {
    data: seedLocalDemoData,
    updatedAt: new Date().toISOString()
  };

  await writePayload(payload);
  return NextResponse.json(payload);
}
