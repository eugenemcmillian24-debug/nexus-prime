export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string; // lucide icon name
}

export const NEXUS_TEMPLATES: Template[] = [
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Modern storefront with product grid, search, and checkout UI.",
    prompt: "Build a modern e-commerce storefront for high-end tech gadgets. Include a responsive product grid, a search bar with filters, and a slide-out shopping cart drawer. Use a clean dark aesthetic with electric green accents.",
    icon: "ShoppingBag",
  },
  {
    id: "dashboard",
    name: "SaaS Dashboard",
    description: "Real-time analytics dashboard with charts, sidebar, and stats.",
    prompt: "Create a SaaS analytics dashboard for monitoring server performance. Include a sidebar for navigation, a grid of status cards (CPU, RAM, Disk), and a main chart area showing traffic over time. Use a dark terminal-inspired design.",
    icon: "LayoutDashboard",
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Minimalist developer portfolio with projects and contact form.",
    prompt: "Design a minimalist developer portfolio. Features: a hero section with a typewriter effect, a featured projects grid with hover effects, and a simple contact form. Theme: Space Mono font and monochromatic with green highlights.",
    icon: "User",
  },
  {
    id: "blog",
    name: "AI Blog",
    description: "Content-focused blog with AI-generated summary snippets.",
    prompt: "Build an AI-focused blog platform. Include a main feed of articles with reading time estimates, category filters, and a search bar. Design should be ultra-minimal and focus on typography.",
    icon: "FileText",
  },
];
