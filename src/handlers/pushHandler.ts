import { ConfigManager } from '../config';
import { GitLabClient } from '../gitlab';
import { approvalsRule } from '../rules';
import { EventPush, WithErr } from '../types';
import { err, isErr, logger } from '../utils';

// TODO проверить что срабатывает. не сбрасывает лайки в МРе, возможно стоит пересмотреть этот подход
export async function pushHandler(
  gitlabClient: GitLabClient,
  configManager: ConfigManager,
  event: EventPush,
): Promise<WithErr<true>> {
  logger('started', 'push handler');

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
    return [err('Not found approvals config')];
  }

  logger(
    'approvalsConfig: ' + JSON.stringify(approvalsConfig, null, 2),
    'push handler',
  );

  const commits = event.commits ?? [];
  const commitId = commits.length ? (commits[0]?.id ?? null) : null;

  if (!commitId) {
    return [err('Commits in push event empty')];
  }

  logger('commitId: ' + commitId, 'push handler');

  const [mergeRequestsError, mergeRequests] =
    await gitlabClient.getCommitMergeRequests({
      projectId,
      commitId,
    });

  if (mergeRequestsError) {
    return [mergeRequestsError];
  }

  if (mergeRequests.length === 0) {
    return [err('Merge requests for push event empty')];
  }

  logger(
    'mergeRequests: ' + JSON.stringify(mergeRequests, null, 2),
    'push handler',
  );

  const approvalsRuleResult = await Promise.all(
    mergeRequests.map(async (mergeRequest) => {
      const mergeRequestId = mergeRequest.iid;

      // Check approvals
      const [approvalsRuleError] = await approvalsRule({
        approvers: [],
        author: '',
        config: approvalsConfig,
        gitlabClient,
        mergeRequestId,
        projectId,
      });

      if (approvalsRuleError) {
        return approvalsRuleError;
      }
    }),
  );

  const approvalsRuleError = approvalsRuleResult.find((obj) => isErr(obj));

  if (approvalsRuleError) {
    return [approvalsRuleError];
  }

  logger('succeed', 'push handler');

  return [null, true];
}
