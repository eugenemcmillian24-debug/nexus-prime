// TeamWorkspace constants
export const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  admin: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Admin", icon: "👑" },
  editor: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Editor", icon: "✏️" },
  viewer: { color: "text-gray-400", bg: "bg-gray-500/10", label: "Viewer", icon: "👁️" },
};

export const ACTION_LABELS: Record<string, { icon: string; label: string }> = {
  edit: { icon: "✏️", label: "edited" },
  create: { icon: "✨", label: "created" },
  deploy: { icon: "🚀", label: "deployed" },
  delete: { icon: "🗑️", label: "deleted" },
  comment: { icon: "💬", label: "commented on" },
  review: { icon: "👀", label: "reviewed" },
  merge: { icon: "🔀", label: "merged" },
  settings: { icon: "⚙️", label: "updated settings for" },
};
