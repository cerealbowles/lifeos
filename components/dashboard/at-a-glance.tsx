import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * One compressed sentence, not a strip of per-domain count badges — DECISIONS.md ADR-043
 * ("no unread counts as the primary attention mechanic"). See lib/today/service.ts's
 * buildGlanceSummary for why.
 */
export function AtAGlance({ summary }: { summary: string | null }) {
  if (summary === null) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>At a glance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{summary}</p>
      </CardContent>
    </Card>
  );
}
