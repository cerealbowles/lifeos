"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { connectWeather } from "@/lib/weather/service";
import { WeatherProviderError } from "@/lib/weather/provider";
import { connectCalendar, disconnectCalendar } from "@/lib/calendar/service";
import { CalendarProviderError } from "@/lib/calendar/provider";
import { connectImmich, disconnectImmich } from "@/lib/immich/service";
import { ImmichError } from "@/lib/immich/client";

export type WeatherFormState = { error?: string; success?: string } | undefined;
export type CalendarFormState = { error?: string; success?: string } | undefined;
export type ImmichFormState = { error?: string; success?: string } | undefined;

const connectWeatherSchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required"),
  postalCode: z.string().trim().min(3, "Enter a valid postal code"),
});

export async function connectWeatherAction(
  _prevState: WeatherFormState,
  formData: FormData,
): Promise<WeatherFormState> {
  const user = await requireUser();

  const parsed = connectWeatherSchema.safeParse({
    apiKey: formData.get("apiKey"),
    postalCode: formData.get("postalCode"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { locationName } = await connectWeather(user.id, parsed.data.apiKey, parsed.data.postalCode);
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: `Connected — showing weather for ${locationName}.` };
  } catch (err) {
    if (err instanceof WeatherProviderError) {
      return { error: err.message };
    }
    return { error: "Could not connect to the weather provider. Please try again." };
  }
}

const connectCalendarSchema = z.object({
  username: z.string().trim().email("Enter your Apple ID email"),
  appPassword: z.string().trim().min(1, "App-specific password is required"),
});

export async function connectCalendarAction(
  _prevState: CalendarFormState,
  formData: FormData,
): Promise<CalendarFormState> {
  const user = await requireUser();

  const parsed = connectCalendarSchema.safeParse({
    username: formData.get("username"),
    appPassword: formData.get("appPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { calendarCount } = await connectCalendar(user.id, parsed.data.username, parsed.data.appPassword);
    revalidatePath("/settings");
    revalidatePath("/");
    revalidatePath("/calendar");
    return { success: `Connected — found ${calendarCount} calendar${calendarCount === 1 ? "" : "s"}.` };
  } catch (err) {
    if (err instanceof CalendarProviderError) {
      return { error: err.message };
    }
    return { error: "Could not connect to iCloud. Please try again." };
  }
}

export async function disconnectCalendarAction(): Promise<void> {
  const user = await requireUser();
  await disconnectCalendar(user.id);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/calendar");
}

const connectImmichSchema = z.object({
  instanceUrl: z.string().trim().url("Enter a valid URL, e.g. http://192.168.1.23:2283"),
  apiKey: z.string().trim().min(1, "API key is required"),
  albumId: z.string().trim().min(1, "Album ID is required"),
});

export async function connectImmichAction(
  _prevState: ImmichFormState,
  formData: FormData,
): Promise<ImmichFormState> {
  const user = await requireUser();

  const parsed = connectImmichSchema.safeParse({
    instanceUrl: formData.get("instanceUrl"),
    apiKey: formData.get("apiKey"),
    albumId: formData.get("albumId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await connectImmich(user.id, parsed.data.instanceUrl, parsed.data.apiKey, parsed.data.albumId);
    revalidatePath("/settings");
    revalidatePath("/feed");
    return { success: "Connected — Moments will upload to this album." };
  } catch (err) {
    if (err instanceof ImmichError) {
      return { error: err.message };
    }
    return { error: "Could not connect to Immich. Please try again." };
  }
}

export async function disconnectImmichAction(): Promise<void> {
  const user = await requireUser();
  await disconnectImmich(user.id);
  revalidatePath("/settings");
  revalidatePath("/feed");
}
