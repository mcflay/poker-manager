/**
 * Notifications API — list notifications and mark as read.
 *
 * GET returns the most recent notifications for the current user.
 * POST marks one or all notifications as read.
 *
 * @endpoint GET /api/notifications → { notifications }
 * @endpoint POST /api/notifications → { success: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  const userFilter = userId ? "WHERE user_id = ?" : "WHERE user_id IS NULL";
  const params = userId ? [userId] : [];

  const rows = sqlite
    .prepare(
      `SELECT * FROM notifications ${userFilter} ORDER BY created_at DESC LIMIT 50`
    )
    .all(...params) as Record<string, unknown>[];

  const notifications = rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    relatedId: r.related_id,
    scheduledFor: r.scheduled_for,
    sentAt: r.sent_at,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  const { id, markAllRead } = await req.json();

  if (markAllRead) {
    const userFilter = userId ? "WHERE user_id = ? AND read_at IS NULL" : "WHERE user_id IS NULL AND read_at IS NULL";
    const params = userId ? [userId] : [];
    sqlite
      .prepare(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP ${userFilter}`)
      .run(...params);
  } else if (id) {
    const userFilter = userId
      ? "WHERE id = ? AND user_id = ?"
      : "WHERE id = ? AND user_id IS NULL";
    const params = userId ? [id, userId] : [id];
    sqlite
      .prepare(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP ${userFilter}`)
      .run(...params);
  } else {
    return NextResponse.json({ error: "id or markAllRead required" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
