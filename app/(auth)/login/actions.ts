"use server";

import { z } from "zod";
import { eq, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

export type AuthFormState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/");
}

const setupSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  timezone: z.string().trim().min(1),
});

export async function setupFirstUser(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  // Guard against creating a second account through this flow after first-run setup.
  const [{ value: existingCount }] = await db.select({ value: count() }).from(users);
  if (existingCount > 0) {
    return { error: "Setup has already been completed. Please log in." };
  }

  const parsed = setupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await db
    .insert(users)
    .values({
      displayName: parsed.data.displayName,
      email: parsed.data.email,
      passwordHash,
      timezone: parsed.data.timezone,
    })
    .returning();

  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
