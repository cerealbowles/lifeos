import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { addMeasurement, listMeasurementsInRange } from "@/lib/measurements/service";
import { MEASUREMENT_RANGES } from "@/lib/measurements/range";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "weight";
  const rangeParam = searchParams.get("range") ?? "90d";
  const range = MEASUREMENT_RANGES.includes(rangeParam as (typeof MEASUREMENT_RANGES)[number])
    ? (rangeParam as (typeof MEASUREMENT_RANGES)[number])
    : "90d";

  const measurements = await listMeasurementsInRange(user.id, type, range);
  return NextResponse.json({ measurements });
}

const addMeasurementSchema = z.object({
  type: z.string().trim().min(1).max(50).default("weight"),
  value: z.coerce.number().positive().max(100000),
  unit: z.string().trim().min(1).max(20),
  measuredAt: z.coerce.date(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = addMeasurementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const measurement = await addMeasurement(user.id, parsed.data);
  return NextResponse.json({ measurement }, { status: 201 });
}
