import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { addFavoriteTeam, listFavoriteTeams, UnknownTeamError } from "@/lib/sports/service";
import { SPORT_OPTIONS } from "@/lib/sports/teams";
import { isUniqueViolation } from "@/lib/db/errors";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await listFavoriteTeams(auth.user.id);
  return NextResponse.json({ teams });
}

const addTeamSchema = z.object({
  sport: z.enum(SPORT_OPTIONS.map((s) => s.key) as [string, ...string[]]),
  teamAbbr: z.string().trim().min(1).max(10),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = addTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const team = await addFavoriteTeam(auth.user.id, parsed.data);
    return NextResponse.json({ team }, { status: 201 });
  } catch (err) {
    if (err instanceof UnknownTeamError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    // Postgres unique_violation — team already followed (favorite_teams_user_team_key).
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "You're already following that team." }, { status: 409 });
    }
    throw err;
  }
}
