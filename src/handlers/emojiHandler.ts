import { ConfigManager } from '../config';
import { GitLabClient } from '../gitlab';
import { approvalsRule } from '../rules';
import { EventEmoji, WithErr } from '../types';
import { err } from '../utils';

export async function emojiHandler(
  gitlabClient: GitLabClient,
  configManager: ConfigManager,
  event: EventEmoji,
): Promise<WithErr<true>> {
  // Get required info
  const projectId = event.project.id;
  const projectPath = event.project.path_with_namespace;
  const [projectConfigError, projectConfig] =
    configManager.getProjectConfig(projectPath);

  if (projectConfigError) {
    return [projectConfigError];
  }

  const approvalsConfig = projectConfig.approvals_config;

  if (!approvalsConfig) {
    return [err('Cannot get approvals rules from config')];
  }

  const isMergeRequest =
    event.object_attributes.awardable_type === 'MergeRequest';

  if (!isMergeRequest || !event.merge_request) {
    return [err('Emoji not in merge request')];
  }

  const mergeRequestId = event.merge_request.iid;

  const [approversError, approvers] =
    await gitlabClient.getMergeRequestApproversUsernames({
      projectId,
      mergeRequestId,
    });

  if (approversError) {
    return [approversError];
  }

  const [authorError, author] =
    await gitlabClient.getMergeRequestAuthorUsername({
      projectId,
      mergeRequestId,
    });

  if (authorError) {
    return [authorError];
  }

  // Check approvals
  const [approvalsRuleError] = await approvalsRule({
    approvers,
    author,
    config: approvalsConfig,
    gitlabClient,
    mergeRequestId,
    projectId,
  });

  if (approvalsRuleError) {
    return [approvalsRuleError];
  }

  return [null, true];
}
