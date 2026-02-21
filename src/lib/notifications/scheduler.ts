/**
 * Client-side notification scheduler.
 *
 * Uses setTimeout to schedule browser notifications before tournament start times.
 * Manages active timers and supports cancellation.
 *
 * @module notifications/scheduler
 */

interface ScheduledReminder {
  tournamentId: string;
  tournamentName: string;
  startTime: Date;
  timerId: ReturnType<typeof setTimeout>;
}

/** Active reminder timers, keyed by tournament ID */
const activeReminders = new Map<string, ScheduledReminder>();

/**
 * Request browser notification permission.
 * @returns Whether permission was granted
 */
export async function requestPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Check if browser notifications are supported and permitted.
 */
export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

/**
 * Check current notification permission status.
 */
export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Schedule a reminder notification for a tournament.
 *
 * @param tournamentId - Unique tournament identifier
 * @param tournamentName - Display name for the notification
 * @param startTime - Tournament start time
 * @param minutesBefore - How many minutes before start to fire the reminder
 * @returns Whether the reminder was successfully scheduled
 */
export function scheduleReminder(
  tournamentId: string,
  tournamentName: string,
  startTime: Date,
  minutesBefore: number = 15
): boolean {
  // Cancel any existing reminder for this tournament
  cancelReminder(tournamentId);

  const reminderTime = new Date(startTime.getTime() - minutesBefore * 60 * 1000);
  const now = new Date();
  const delay = reminderTime.getTime() - now.getTime();

  // Don't schedule if the reminder time has already passed
  if (delay <= 0) return false;

  const timerId = setTimeout(() => {
    showNotification(tournamentName, minutesBefore);
    activeReminders.delete(tournamentId);
  }, delay);

  activeReminders.set(tournamentId, {
    tournamentId,
    tournamentName,
    startTime,
    timerId,
  });

  return true;
}

/**
 * Cancel a scheduled reminder.
 */
export function cancelReminder(tournamentId: string): void {
  const reminder = activeReminders.get(tournamentId);
  if (reminder) {
    clearTimeout(reminder.timerId);
    activeReminders.delete(tournamentId);
  }
}

/**
 * Cancel all active reminders.
 */
export function cancelAllReminders(): void {
  for (const [, reminder] of activeReminders) {
    clearTimeout(reminder.timerId);
  }
  activeReminders.clear();
}

/**
 * Get the count of currently active reminders.
 */
export function getActiveReminderCount(): number {
  return activeReminders.size;
}

/**
 * Show a browser notification for a tournament reminder.
 */
function showNotification(tournamentName: string, minutesBefore: number): void {
  if (Notification.permission !== "granted") return;

  new Notification("Tournament Starting Soon", {
    body: `${tournamentName} starts in ${minutesBefore} minutes`,
    icon: "/favicon.ico",
    tag: `tournament-${tournamentName}`,
  });
}
