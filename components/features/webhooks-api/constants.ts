// Webhook and API configuration constants
export const WEBHOOK_EVENTS = [
  { id: "project.deploy", label: "Deployment completed", icon: "🚀" },
  { id: "project.build_failed", label: "Build failed", icon: "❌" },
  { id: "project.file_changed", label: "File changed", icon: "📝" },
  { id: "project.version_created", label: "Version created", icon: "📸" },
  { id: "code_review.completed", label: "Code review completed", icon: "🔍" },
  { id: "team.member_joined", label: "Team member joined", icon: "👤" },
  { id: "team.member_left", label: "Team member left", icon: "👋" },
  { id: "prompt.completed", label: "Prompt completed", icon: "🤖" },
  { id: "component.published", label: "Component published", icon: "🧩" },
  { id: "domain.verified", label: "Domain verified", icon: "🌐" },
];

export const API_SCOPES = [
  { id: "project:read", label: "Read project data", description: "View project files, settings, and metadata" },
  { id: "project:write", label: "Write project data", description: "Create, update, delete project files" },
  { id: "deploy:read", label: "Read deployments", description: "View deployment status and history" },
  { id: "deploy:write", label: "Trigger deployments", description: "Start new deployments" },
  { id: "prompt:read", label: "Read prompts", description: "Access prompt history and templates" },
  { id: "prompt:write", label: "Execute prompts", description: "Run AI prompts via API" },
  { id: "team:read", label: "Read team data", description: "View team members and roles" },
  { id: "team:write", label: "Manage team", description: "Invite, remove, update team members" },
  { id: "webhook:manage", label: "Manage webhooks", description: "Create, update, delete webhooks" },
];

