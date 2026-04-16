"use client";

import React, { useState, useEffect, useCallback } from "react";

interface Notification {
  id: string;
  type: "deploy" | "review" | "team" | "system" | "mention" | "version";
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

interface NotificationCenterProps {
  userId: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  deploy: { icon: "🚀", color: "#6366f1" },
  review: { icon: "🔍", color: "#f59e0b" },
  team: { icon: "👥", color: "#10b981" },
  system: { icon: "⚙️", color: "#737373" },
  mention: { icon: "💬", color: "#3b82f6" },
  version: { icon: "📸", color: "#8b5cf6" },
};

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const clearAll = async () => {
    try {
      await fetch("/api/notifications", { method: "DELETE" });
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear:", err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter && n.type !== filter) return false;
    if (showUnreadOnly && n.read) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group by date
  const grouped = filtered.reduce((acc, n) => {
    const date = new Date(n.createdAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a", color: "#e5e5e5" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Notifications</h2>
            {unreadCount > 0 && (
              <span style={{
                padding: "2px 8px", borderRadius: "10px", fontSize: "11px",
                background: "#6366f1", color: "#fff", fontWeight: 600,
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  padding: "6px 12px", borderRadius: "6px", border: "1px solid #262626",
                  background: "transparent", color: "#a3a3a3", cursor: "pointer", fontSize: "12px",
                }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={clearAll}
              style={{
                padding: "6px 12px", borderRadius: "6px", border: "1px solid #262626",
                background: "transparent", color: "#737373", cursor: "pointer", fontSize: "12px",
              }}
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            style={{
              padding: "4px 10px", borderRadius: "12px", fontSize: "12px", border: "1px solid",
              borderColor: showUnreadOnly ? "#6366f1" : "#262626",
              background: showUnreadOnly ? "#1e1b4b" : "transparent",
              color: showUnreadOnly ? "#a5b4fc" : "#737373", cursor: "pointer",
            }}
          >
            Unread
          </button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? null : type)}
              style={{
                padding: "4px 10px", borderRadius: "12px", fontSize: "12px", border: "1px solid",
                borderColor: filter === type ? config.color : "#262626",
                background: filter === type ? config.color + "20" : "transparent",
                color: filter === type ? config.color : "#525252", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "4px",
              }}
            >
              <span style={{ fontSize: "11px" }}>{config.icon}</span>
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#525252" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔔</div>
            <p>No notifications</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#525252", padding: "8px 0 4px", fontWeight: 600 }}>
                {date === new Date().toLocaleDateString() ? "Today" : date}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {items.map((notification) => {
                  const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
                  return (
                    <div
                      key={notification.id}
                      onClick={() => !notification.read && markRead(notification.id)}
                      style={{
                        padding: "12px 14px", borderRadius: "10px",
                        background: notification.read ? "#171717" : "#171717",
                        border: `1px solid ${notification.read ? "#262626" : typeConfig.color + "40"}`,
                        cursor: notification.read ? "default" : "pointer",
                        display: "flex", gap: "12px", alignItems: "flex-start",
                        opacity: notification.read ? 0.7 : 1,
                      }}
                    >
                      {!notification.read && (
                        <div style={{
                          width: "6px", height: "6px", borderRadius: "50%",
                          background: typeConfig.color, marginTop: "6px", flexShrink: 0,
                        }} />
                      )}
                      <span style={{ fontSize: "16px", flexShrink: 0 }}>{typeConfig.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: notification.read ? 400 : 500, marginBottom: "2px" }}>
                          {notification.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "#737373", lineHeight: 1.4 }}>
                          {notification.message}
                        </div>
                        {notification.actionUrl && (
                          <a
                            href={notification.actionUrl}
                            style={{
                              display: "inline-block", marginTop: "6px", fontSize: "12px",
                              color: typeConfig.color, textDecoration: "none",
                            }}
                          >
                            {notification.actionLabel || "View →"}
                          </a>
                        )}
                      </div>
                      <span style={{ fontSize: "11px", color: "#3f3f46", flexShrink: 0 }}>
                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
