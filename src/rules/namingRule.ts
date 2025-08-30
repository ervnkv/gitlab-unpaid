import { GitLabClient } from '../gitlab';
import { NamingConfig, WithErr } from '../types';
import { logger } from '../utils';

type NamingRule = {
  mergeRequestTitle: string;
  branch: string;
  commits: string[];
  config: NamingConfig;
  gitlabClient: GitLabClient;
  projectId: number;
  mergeRequestId: number;
};

export async function namingRule({
  mergeRequestTitle,
  branch,
  commits,
  config,
  gitlabClient,
  projectId,
  mergeRequestId,
}: NamingRule): Promise<WithErr<true>> {
  logger('started', 'naming rule');

  // Check naming
  let body = `${config.identifier}`;
  let rulesMessage = ``;

  let allRulesValid = true;

  // Check MR title
  const mrTitleRule = config.mr_title;
  if (mrTitleRule) {
    const mrTitleRegex = new RegExp(mrTitleRule.pattern);
    const isMrTitleValid = mrTitleRegex.test(mergeRequestTitle);
    if (!isMrTitleValid) allRulesValid = false;
    rulesMessage += `\n\n${isMrTitleValid ? ':white_check_mark:' : ':x:'} ${mrTitleRule.name} ${mrTitleRule.pattern}`;
  }

  // Check branch name
  const branchRule = config.branch_name;
  if (branchRule) {
    const branchRegex = new RegExp(branchRule.pattern);
    const isBranchValid = branchRegex.test(branch);
    if (!isBranchValid) allRulesValid = false;
    rulesMessage += `\n\n${isBranchValid ? ':white_check_mark:' : ':x:'} ${branchRule.name} ${branchRule.pattern}`;
  }

  // Check commit messages
  const commitsRule = config.commit_message;
  if (commitsRule) {
    const commitsRegex = new RegExp(commitsRule.pattern);
    commits.forEach((commit) => {
      const isCommitsValid = commitsRegex.test(commit);
      rulesMessage += `\n\n${isCommitsValid ? ':white_check_mark:' : ':x:'} ${commitsRule.name} ${commitsRule.pattern}`;
      if (!isCommitsValid) allRulesValid = false;
    });
  }

  logger('allRulesValid: ' + allRulesValid, 'naming rule');

  if (allRulesValid) {
    body += `\n\n${config.success}`;
  } else {
    body += `\n\n${config.failed}`;
  }

  body += rulesMessage;

  // Update bot thread
  const [botThreadError, botThread] = await gitlabClient.findBotThread({
    projectId,
    mergeRequestId,
    identifier: config.identifier,
  });

  if (botThreadError) {
    return [botThreadError];
  }

  logger('botThread: ' + JSON.stringify(botThread, null, 2), 'naming rule');

  const [updateTreadError] = await gitlabClient.updateTread({
    projectId,
    mergeRequestId,
    body,
    resolved: allRulesValid,
    discussionId: botThread?.discussionId,
    noteId: botThread?.noteId,
  });

  if (updateTreadError) {
    return [updateTreadError];
  }

  logger('succeed', 'naming rule');

  return [null, true];
}
