import { GitLabClient } from '../gitlab';
import { ApprovalsConfig, WithErr } from '../types';

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
  // Check approvals
  let body = `${config.identifier}\n\n`;

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
    body += `${config.success}\n\n`;
  } else {
    body += `${config.failed}\n\n`;
  }

  allowedApproversMap.forEach(({ username, approved }) => {
    body += `${approved ? ':white_check_mark:' : ':x:'}  @${username}\n\n`;
  });

  // Update bot thread
  const [botThreadError, botThread] = await gitlabClient.findBotThread({
    projectId,
    mergeRequestId,
    identifier: config.identifier,
  });

  if (botThreadError) {
    return [botThreadError];
  }

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

  return [null, true];
}
