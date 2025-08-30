import { ConfigManager } from '../config';
import { GitLabClient } from '../gitlab';
import { approvalsRule, namingRule } from '../rules';
import { EventMergeRequest, WithErr } from '../types';
import { logger } from '../utils';

export async function mergeRequestHandler(
  gitlabClient: GitLabClient,
  configManager: ConfigManager,
  event: EventMergeRequest,
): Promise<WithErr<true>> {
  logger('started', 'mergeRequest handler');

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

  // logger(
  //   'approvalsConfig: ' + JSON.stringify(approvalsConfig, null, 2),
  //   'mergeRequest handler',
  // );

  if (approvalsConfig) {
    logger('approvalsRule started', 'mergeRequest handler');

    const [authorError, author] =
      await gitlabClient.getMergeRequestAuthorUsername({
        projectId,
        mergeRequestId,
      });

    if (authorError) {
      return [authorError];
    }

    logger('author: ' + author, 'mergeRequest handler');

    const [approversError, approvers] =
      await gitlabClient.getMergeRequestApproversUsernames({
        projectId,
        mergeRequestId,
      });

    if (approversError) {
      return [approversError];
    }

    logger('approvers: ' + approvers, 'mergeRequest handler');

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

    logger('approvalsRule ended', 'mergeRequest handler');
  }

  const namingConfig = projectConfig.naming_config;

  logger(
    'namingConfig: ' + JSON.stringify(namingConfig, null, 2),
    'mergeRequest handler',
  );

  if (namingConfig) {
    logger('namingRule started', 'mergeRequest handler');

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

    logger('commits: ' + commits, 'mergeRequest handler');

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

    logger('namingRule ended', 'mergeRequest handler');
  }

  logger('succeed', 'mergeRequest handler');

  return [null, true];
}
