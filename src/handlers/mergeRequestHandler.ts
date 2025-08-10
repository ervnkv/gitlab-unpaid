import { ConfigManager } from '../config';
import { GitLabClient } from '../gitlab';
import { approvalsRule, namingRule } from '../rules';
import { EventMergeRequest, WithErr } from '../types';

export async function mergeRequestHandler(
  gitlabClient: GitLabClient,
  configManager: ConfigManager,
  event: EventMergeRequest,
): Promise<WithErr<true>> {
  // Get required info
  const projectId = event.project.id;
  const projectPath = event.project.path_with_namespace;
  const [projectConfigError, projectConfig] =
    configManager.getProjectConfig(projectPath);

  if (projectConfigError) {
    return [projectConfigError];
  }

  const mergeRequestId = event.object_attributes.iid;

  const approvalsConfig = projectConfig.approvals_config;

  if (approvalsConfig) {
    const [authorError, author] =
      await gitlabClient.getMergeRequestAuthorUsername({
        projectId,
        mergeRequestId,
      });

    if (authorError) {
      return [authorError];
    }

    const [approversError, approvers] =
      await gitlabClient.getMergeRequestApproversUsernames({
        projectId,
        mergeRequestId,
      });

    if (approversError) {
      return [approversError];
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
  }

  const namingConfig = projectConfig.naming_config;

  if (namingConfig) {
    const mergeRequestTitle = event.object_attributes.title;
    const branch = event.object_attributes.source_branch;

    const [commitsError, commits] =
      await gitlabClient.getMergeRequestCommitsMessages({
        projectId,
        mergeRequestId,
      });

    if (commitsError) {
      return [commitsError];
    }

    // Check naming
    const [namingRuleError] = await namingRule({
      gitlabClient,
      mergeRequestId,
      config: namingConfig,
      projectId,
      branch,
      commits,
      mergeRequestTitle,
    });

    if (namingRuleError) {
      return [namingRuleError];
    }
  }

  return [null, true];
}
