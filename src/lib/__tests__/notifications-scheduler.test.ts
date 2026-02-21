/**
 * Tests for the notification scheduler module.
 *
 * Verifies reminder scheduling, cancellation, and permission checks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock browser Notification API
const mockNotification = vi.fn();
Object.defineProperty(globalThis, "Notification", {
  writable: true,
  value: Object.assign(mockNotification, {
    permission: "default" as NotificationPermission,
    requestPermission: vi.fn(),
  }),
});

import {
  scheduleReminder,
  cancelReminder,
  cancelAllReminders,
  getActiveReminderCount,
  isNotificationSupported,
  getPermissionStatus,
  requestPermission,
} from "@/lib/notifications/scheduler";

describe("notifications/scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cancelAllReminders();
    vi.clearAllMocks();
    (Notification as unknown as { permission: string }).permission = "granted";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isNotificationSupported returns true when Notification exists", () => {
    expect(isNotificationSupported()).toBe(true);
  });

  it("getPermissionStatus returns current permission", () => {
    (Notification as unknown as { permission: string }).permission = "denied";
    expect(getPermissionStatus()).toBe("denied");
  });

  it("requestPermission calls Notification.requestPermission", async () => {
    (Notification as unknown as { permission: string }).permission = "default";
    (Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue("granted");

    const result = await requestPermission();
    expect(result).toBe(true);
    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  it("scheduleReminder sets a timer", () => {
    const future = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now
    const result = scheduleReminder("t1", "Test Tournament", future, 15);

    expect(result).toBe(true);
    expect(getActiveReminderCount()).toBe(1);
  });

  it("scheduleReminder returns false for past times", () => {
    const past = new Date(Date.now() - 60 * 1000); // 1 min ago
    const result = scheduleReminder("t1", "Old Tournament", past, 15);

    expect(result).toBe(false);
    expect(getActiveReminderCount()).toBe(0);
  });

  it("scheduleReminder fires notification at the right time", () => {
    const future = new Date(Date.now() + 20 * 60 * 1000); // 20 min from now
    scheduleReminder("t1", "Test Tournament", future, 15);

    // Advance 5 minutes (reminder fires at 5 min from now = 20 - 15)
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(mockNotification).toHaveBeenCalledWith("Tournament Starting Soon", {
      body: "Test Tournament starts in 15 minutes",
      icon: "/favicon.ico",
      tag: "tournament-Test Tournament",
    });
    expect(getActiveReminderCount()).toBe(0);
  });

  it("cancelReminder removes the timer", () => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    scheduleReminder("t1", "Test", future, 15);
    expect(getActiveReminderCount()).toBe(1);

    cancelReminder("t1");
    expect(getActiveReminderCount()).toBe(0);
  });

  it("cancelAllReminders clears all timers", () => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    scheduleReminder("t1", "Test 1", future, 15);
    scheduleReminder("t2", "Test 2", future, 15);
    expect(getActiveReminderCount()).toBe(2);

    cancelAllReminders();
    expect(getActiveReminderCount()).toBe(0);
  });

  it("scheduling replaces existing reminder for same tournament", () => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    scheduleReminder("t1", "Test", future, 15);
    scheduleReminder("t1", "Test Updated", future, 10);

    expect(getActiveReminderCount()).toBe(1);
  });
});
