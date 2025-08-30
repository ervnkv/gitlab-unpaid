import { GitLabClient } from '../gitlab';
import { ApprovalsConfig, WithErr } from '../types';
import { logger } from '../utils';

type ApprovalsRule = {
  approvers: string[];
  author: string;
  config: ApprovalsConfig;
  gitlabClient: GitLabClient;
  projectId: number;
  mergeRequestId: number;
};

export async function approvalsRule({
  approvers,
  author,
  config,
  gitlabClient,
  projectId,
  mergeRequestId,
}: ApprovalsRule): Promise<WithErr<true>> {
  logger('started', 'approvals rule');

  // Check approvals
  let body = `${config.identifier}`;

  const requiredApproversCount = config.required_count;
  const allowedApprovers = config.allowed_approvers.filter(
    (allowed) => allowed !== author,
  );

  const allowedApproversMap = allowedApprovers.map((username) => ({
    username,
    approved: approvers.includes(username),
  }));

  const currentApproversCount = allowedApproversMap.filter(
    ({ approved }) => approved === true,
  ).length;

  const isMergeRequestApproved =
    currentApproversCount >= requiredApproversCount;

  if (isMergeRequestApproved) {
    body += `\n\n${config.success}`;
  } else {
    body += `\n\n${config.failed}`;
  }

  allowedApproversMap.forEach(({ username, approved }) => {
    body += `\n\n${approved ? ':white_check_mark:' : ':x:'}  @${username}`;
  });

  logger(
    'allowedApproversMap: ' + JSON.stringify(allowedApproversMap, null, 2),
    'approvals rule',
  );

  // Update bot thread
  const [botThreadError, botThread] = await gitlabClient.findBotThread({
    projectId,
    mergeRequestId,
    identifier: config.identifier,
  });

  if (botThreadError) {
    return [botThreadError];
  }

  logger('botThread: ' + JSON.stringify(botThread, null, 2), 'approvals rule');

  const [updateTreadError] = await gitlabClient.updateTread({
    projectId,
    mergeRequestId,
    body,
    resolved: isMergeRequestApproved,
    discussionId: botThread?.discussionId,
    noteId: botThread?.noteId,
  });

  if (updateTreadError) {
    return [updateTreadError];
  }

  logger('succeed', 'approvals rule');

  return [null, true];
}
