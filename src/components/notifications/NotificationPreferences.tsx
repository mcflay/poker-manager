/**
 * NotificationPreferences — settings form for notification preferences.
 *
 * Controls browser notification permission, reminder timing,
 * and daily digest settings.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  requestPermission,
  getPermissionStatus,
  isNotificationSupported,
} from "@/lib/notifications/scheduler";

interface Preferences {
  enableBrowser: boolean;
  reminderMinutesBefore: number;
  enableDailyDigest: boolean;
  digestTime: string;
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences>({
    enableBrowser: false,
    reminderMinutesBefore: 15,
    enableDailyDigest: false,
    digestTime: "09:00",
  });
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>("default");

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setPrefs(data.preferences);
      }
    } catch {
      // use defaults
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
    if (isNotificationSupported()) {
      setPermissionStatus(getPermissionStatus());
    }
  }, [fetchPrefs]);

  const handleEnableBrowser = async () => {
    const granted = await requestPermission();
    setPermissionStatus(getPermissionStatus());
    if (granted) {
      setPrefs((p) => ({ ...p, enableBrowser: true }));
      toast.success("Browser notifications enabled");
    } else {
      toast.error("Notification permission denied");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error();
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Notification Preferences</h3>

      {/* Browser notifications */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Browser Notifications</Label>
          {isNotificationSupported() ? (
            permissionStatus === "granted" ? (
              <span className="text-xs text-emerald-500">Enabled</span>
            ) : permissionStatus === "denied" ? (
              <span className="text-xs text-red-500">Blocked in browser</span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleEnableBrowser}
              >
                Enable
              </Button>
            )
          ) : (
            <span className="text-xs text-muted-foreground">Not supported</span>
          )}
        </div>
      </div>

      {/* Reminder timing */}
      <div className="space-y-1">
        <Label htmlFor="reminder-minutes" className="text-xs">
          Reminder (minutes before start)
        </Label>
        <Input
          id="reminder-minutes"
          type="number"
          min="1"
          max="120"
          value={prefs.reminderMinutesBefore}
          onChange={(e) =>
            setPrefs((p) => ({
              ...p,
              reminderMinutesBefore: parseInt(e.target.value) || 15,
            }))
          }
          className="h-8 text-sm w-24"
        />
      </div>

      {/* Daily digest */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="daily-digest"
            checked={prefs.enableDailyDigest}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, enableDailyDigest: e.target.checked }))
            }
            className="rounded border-input"
          />
          <Label htmlFor="daily-digest" className="text-xs">
            Daily digest email
          </Label>
        </div>

        {prefs.enableDailyDigest && (
          <div className="ml-5">
            <Label htmlFor="digest-time" className="text-xs">
              Send at
            </Label>
            <Input
              id="digest-time"
              type="time"
              value={prefs.digestTime}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, digestTime: e.target.value }))
              }
              className="h-8 text-sm w-32"
            />
          </div>
        )}
      </div>

      <Button
        size="sm"
        className="h-8 text-xs"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save Preferences"}
      </Button>
    </div>
  );
}
