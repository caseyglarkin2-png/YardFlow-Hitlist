/**
 * Agent Squad - Centralized Exports
 * 
 * Import all agents from a single location:
 * import { ProspectingAgent, ResearchAgent, AgentOrchestrator } from '@/lib/agents';
 */

export { ProspectingAgent } from './prospecting-agent';
export { ResearchAgent } from './research-agent';
export { SequenceEngineerAgent } from './sequence-engineer-agent';
export { ContentPurposingAgent } from './content-purposing-agent';
export { GraphicsAgent } from './graphics-agent';
export { SocialsAgent } from './socials-agent';
export { ContractingAgent } from './contracting-agent';
export { AgentOrchestrator } from './orchestrator';

// Export types
export type { ProspectingCriteria, DiscoveredLead } from './prospecting-agent';
export type { ResearchInput, CompanyDossier } from './research-agent';
export type { SequenceBlueprint, SequenceStep } from './sequence-engineer-agent';
export type { ContentRequest, PurposedContent } from './content-purposing-agent';
export type { GraphicsRequest, GeneratedGraphic } from './graphics-agent';
export type { SocialPost, EngagementAction } from './socials-agent';
export type { ContractRequest, GeneratedContract } from './contracting-agent';
export type { CampaignWorkflow, AgentTask } from './orchestrator';
