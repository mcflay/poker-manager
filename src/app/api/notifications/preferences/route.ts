/**
 * Notification preferences API — get and update user notification settings.
 *
 * @endpoint GET /api/notifications/preferences → { preferences }
 * @endpoint PUT /api/notifications/preferences → { preferences }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

const defaultPreferences = {
  enableBrowser: false,
  reminderMinutesBefore: 15,
  enableDailyDigest: false,
  digestTime: "09:00",
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const userFilter = userId ? "WHERE user_id = ?" : "WHERE user_id IS NULL";
  const params = userId ? [userId] : [];

  const row = sqlite
    .prepare(`SELECT * FROM notification_preferences ${userFilter}`)
    .get(...params) as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json({ preferences: defaultPreferences });
  }

  return NextResponse.json({
    preferences: {
      enableBrowser: Boolean(row.enable_browser),
      reminderMinutesBefore: row.reminder_minutes_before,
      enableDailyDigest: Boolean(row.enable_daily_digest),
      digestTime: row.digest_time,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { enableBrowser, reminderMinutesBefore, enableDailyDigest, digestTime } =
    await req.json();

  const userFilter = userId ? "WHERE user_id = ?" : "WHERE user_id IS NULL";
  const params = userId ? [userId] : [];

  const existing = sqlite
    .prepare(`SELECT id FROM notification_preferences ${userFilter}`)
    .get(...params) as { id: string } | undefined;

  if (existing) {
    sqlite
      .prepare(
        `UPDATE notification_preferences SET
          enable_browser = ?,
          reminder_minutes_before = ?,
          enable_daily_digest = ?,
          digest_time = ?
        ${userFilter}`
      )
      .run(
        enableBrowser ? 1 : 0,
        reminderMinutesBefore ?? 15,
        enableDailyDigest ? 1 : 0,
        digestTime ?? "09:00",
        ...params
      );
  } else {
    sqlite
      .prepare(
        "INSERT INTO notification_preferences (id, user_id, enable_browser, reminder_minutes_before, enable_daily_digest, digest_time) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        randomUUID(),
        userId ?? null,
        enableBrowser ? 1 : 0,
        reminderMinutesBefore ?? 15,
        enableDailyDigest ? 1 : 0,
        digestTime ?? "09:00"
      );
  }

  return NextResponse.json({
    preferences: {
      enableBrowser: Boolean(enableBrowser),
      reminderMinutesBefore: reminderMinutesBefore ?? 15,
      enableDailyDigest: Boolean(enableDailyDigest),
      digestTime: digestTime ?? "09:00",
    },
  });
}
