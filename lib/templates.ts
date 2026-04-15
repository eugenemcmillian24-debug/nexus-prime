export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  category: "web" | "saas" | "mobile" | "ai" | "creative";
}

export const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "web", label: "Web Apps" },
  { id: "saas", label: "SaaS" },
  { id: "mobile", label: "Mobile" },
  { id: "ai", label: "AI Tools" },
  { id: "creative", label: "Creative" },
] as const;

export const NEXUS_TEMPLATES: Template[] = [
  // ── Web Apps ──────────────────────────────────────────
  {
    id: "ecommerce",
    name: "E-commerce Store",
    description: "Modern storefront with product grid, search, and checkout UI.",
    prompt: "Build a modern e-commerce storefront for high-end tech gadgets. Include a responsive product grid, a search bar with filters, and a slide-out shopping cart drawer. Use a clean dark aesthetic with electric green accents.",
    icon: "ShoppingBag",
    category: "web",
  },
  {
    id: "portfolio",
    name: "Developer Portfolio",
    description: "Minimalist developer portfolio with projects and contact form.",
    prompt: "Design a minimalist developer portfolio. Features: a hero section with a typewriter effect, a featured projects grid with hover effects, and a simple contact form. Theme: Space Mono font and monochromatic with green highlights.",
    icon: "User",
    category: "web",
  },
  {
    id: "blog",
    name: "AI Blog Platform",
    description: "Content-focused blog with AI-generated summary snippets.",
    prompt: "Build an AI-focused blog platform. Include a main feed of articles with reading time estimates, category filters, and a search bar. Design should be ultra-minimal and focus on typography.",
    icon: "FileText",
    category: "web",
  },
  {
    id: "landing",
    name: "SaaS Landing Page",
    description: "High-converting landing page with hero, features, pricing, and CTA.",
    prompt: "Build a high-converting SaaS landing page. Include: animated hero section with gradient text, feature grid with icons, pricing table with 3 tiers, testimonials carousel, and a sticky CTA button. Use dark theme with accent gradients.",
    icon: "Rocket",
    category: "web",
  },
  {
    id: "restaurant",
    name: "Restaurant Website",
    description: "Elegant restaurant site with menu, reservations, and gallery.",
    prompt: "Design a premium restaurant website. Include: full-screen hero with parallax, interactive menu with categories and dietary filters, reservation form with date picker, and a photo gallery. Use warm dark tones with gold accents.",
    icon: "UtensilsCrossed",
    category: "web",
  },

  // ── SaaS ──────────────────────────────────────────────
  {
    id: "dashboard",
    name: "Analytics Dashboard",
    description: "Real-time analytics dashboard with charts, sidebar, and stats.",
    prompt: "Create a SaaS analytics dashboard for monitoring server performance. Include a sidebar for navigation, a grid of status cards (CPU, RAM, Disk), and a main chart area showing traffic over time. Use a dark terminal-inspired design.",
    icon: "LayoutDashboard",
    category: "saas",
  },
  {
    id: "crm",
    name: "CRM Dashboard",
    description: "Customer relationship manager with pipeline, contacts, and deals.",
    prompt: "Build a CRM dashboard with a Kanban-style deal pipeline, contacts table with search and filters, activity timeline, and deal analytics charts. Use a professional dark UI with blue accent colors.",
    icon: "Users",
    category: "saas",
  },
  {
    id: "project-mgmt",
    name: "Project Manager",
    description: "Kanban board with tasks, assignments, and progress tracking.",
    prompt: "Create a project management app with: Kanban board (drag-and-drop columns), task cards with assignees and due dates, a sidebar with project list, and a top bar with search and notifications. Dark theme with purple accents.",
    icon: "Kanban",
    category: "saas",
  },

  // ── AI Tools ──────────────────────────────────────────
  {
    id: "ai-chat",
    name: "AI Chat Interface",
    description: "ChatGPT-style conversational AI interface with streaming.",
    prompt: "Build a ChatGPT-style AI chat interface. Include: message bubbles with markdown rendering, a prompt input with send button, conversation sidebar, model selector dropdown, and code block syntax highlighting. Dark theme with green AI accent.",
    icon: "MessageSquare",
    category: "ai",
  },
  {
    id: "ai-image",
    name: "AI Image Generator",
    description: "Text-to-image generation UI with gallery and prompt history.",
    prompt: "Design an AI image generation tool. Include: prompt input with style selectors (photorealistic, anime, abstract), image gallery grid with lightbox, generation history sidebar, and download/share buttons. Dark creative theme.",
    icon: "Image",
    category: "ai",
  },

  // ── Creative ──────────────────────────────────────────
  {
    id: "music-player",
    name: "Music Player",
    description: "Spotify-style music player with playlists and visualizer.",
    prompt: "Build a music streaming player UI. Include: now-playing bar with progress slider, playlist sidebar, album art display, song queue, and a simple audio visualizer. Use a dark theme with vibrant gradient accents.",
    icon: "Music",
    category: "creative",
  },
  {
    id: "video-editor",
    name: "Video Editor UI",
    description: "Timeline-based video editor with preview and effects panel.",
    prompt: "Create a video editor interface with: video preview player, multi-track timeline with drag handles, effects panel sidebar, media library, and export settings dialog. Dark professional editing suite aesthetic.",
    icon: "Film",
    category: "creative",
  },

  // ── Mobile ────────────────────────────────────────────
  {
    id: "fitness-app",
    name: "Fitness Tracker",
    description: "Mobile-first fitness app with workout tracking and stats.",
    prompt: "Design a mobile-first fitness tracker app. Include: today's workout card, exercise list with sets/reps, progress ring charts, weekly stats, and a bottom navigation bar. Dark theme with energetic orange/green accents. Optimize for mobile viewport.",
    icon: "Dumbbell",
    category: "mobile",
  },
];
