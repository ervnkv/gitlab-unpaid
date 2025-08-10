import { ConfigManager } from '../config';
import { GitLabClient } from '../gitlab';
import { approvalsRule } from '../rules';
import { EventPush, WithErr } from '../types';
import { err, isErr } from '../utils';

export async function pushHandler(
  gitlabClient: GitLabClient,
  configManager: ConfigManager,
  event: EventPush,
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
    return [err('Not found approvals config')];
  }

  const commits = event.commits ?? [];
  const commitId = commits.length ? (commits[0]?.id ?? null) : null;

  if (!commitId) {
    return [err('Commits in push event empty')];
  }

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

  return [null, true];
}
