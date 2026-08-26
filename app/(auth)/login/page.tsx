import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { SetupForm } from "./setup-form";

export default async function LoginPage() {
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  const isFirstRun = userCount === 0;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base normal-case tracking-normal text-neutral-900 dark:text-neutral-100">
            {isFirstRun ? "Set up LifeOS" : "Sign in to LifeOS"}
          </CardTitle>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {isFirstRun
              ? "Create the first account for this LifeOS instance."
              : "Your personal life operating system."}
          </p>
        </CardHeader>
        <CardContent>{isFirstRun ? <SetupForm /> : <LoginForm />}</CardContent>
      </Card>
    </div>
  );
}
