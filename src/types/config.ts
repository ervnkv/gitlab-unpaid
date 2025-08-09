import { number, object, record, string, z } from 'zod';

export const ApprovalsConfigSchema = object({
  identifier: string(),
  success: string(),
  failed: string(),
  required_count: number(),
  allowed_approvers: string().array(),
});

export type ApprovalsConfig = z.infer<typeof ApprovalsConfigSchema>;

const NamingRuleSchema = object({
  name: string(),
  pattern: string(),
});

export const NamingConfigSchema = object({
  identifier: string(),
  success: string(),
  failed: string(),
  mr_title: NamingRuleSchema.optional(),
  branch_name: NamingRuleSchema.optional(),
  commit_message: NamingRuleSchema.optional(),
});

export type NamingConfig = z.infer<typeof NamingConfigSchema>;

export const ProjectConfigSchema = object({
  approvals_config: ApprovalsConfigSchema.optional(),
  naming_config: NamingConfigSchema.optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const BotConfigSchema = object({
  projects: record(string(), ProjectConfigSchema),
});

export type BotConfig = z.infer<typeof BotConfigSchema>;
