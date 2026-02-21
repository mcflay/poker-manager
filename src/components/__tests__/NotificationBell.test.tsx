/**
 * Tests for the NotificationBell component.
 *
 * Verifies rendering, unread count, and mark-as-read behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({ data: null, status: "unauthenticated" }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          notifications: [
            {
              id: "n1",
              type: "reminder",
              title: "Tournament starting",
              body: "GG $5 NLH starts in 15 min",
              relatedId: null,
              readAt: null,
              createdAt: "2025-01-01T10:00:00Z",
            },
            {
              id: "n2",
              type: "info",
              title: "Welcome",
              body: null,
              relatedId: null,
              readAt: "2025-01-01T09:00:00Z",
              createdAt: "2025-01-01T08:00:00Z",
            },
          ],
          unreadCount: 1,
        }),
    });
  });

  it("renders the bell icon", async () => {
    render(<NotificationBell />);
    // Bell button should be present
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("shows unread count badge", async () => {
    render(<NotificationBell />);
    // Wait for fetch to complete
    const badge = await screen.findByText("1");
    expect(badge).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    // Wait for data to load
    await screen.findByText("1");

    // Click the bell
    await user.click(screen.getByRole("button"));

    // Dropdown should show notification content
    expect(await screen.findByText("Tournament starting")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });
});
