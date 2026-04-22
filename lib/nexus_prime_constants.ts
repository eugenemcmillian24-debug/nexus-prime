/**
 * NEXUS PRIME Global Constants
 * Shared between client and server components.
 */

export const TIER_LIMITS = {
  'Starter': { seats: 2, premiumAgents: false, buildCost: 8, priorityCompute: false },
  'PRO': { seats: 10, premiumAgents: true, buildCost: 5, priorityCompute: true },
  'Enterprise': { seats: 50, premiumAgents: true, buildCost: 2, priorityCompute: true },
  'admin': { seats: Infinity, premiumAgents: true, buildCost: 0, priorityCompute: true }
};

export const PREMIUM_AGENTS = [
  { id: 'marketing-psy', name: 'Marketing Psychology Agent', cost: 25, description: 'Optimizes UI for conversion.' },
  { id: 'security-guru', name: 'Security Penetration Guru', cost: 50, description: 'Deep security hardening.' },
  { id: 'seo-architect', name: 'SEO Architect', cost: 30, description: 'Auto-generates ranking metadata.' },
];
