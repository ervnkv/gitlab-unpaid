import { GitLabClient } from '../gitlab';
import { NamingConfig, WithErr } from '../types';

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
  // Check naming
  let body = `${config.identifier}\n\n`;
  let rulesMessage = ``;

  let allRulesValid = true;

  // Check MR title
  const mrTitleRule = config.mr_title;
  if (mrTitleRule) {
    const mrTitleRegex = new RegExp(mrTitleRule.pattern);
    const isMrTitleValid = mrTitleRegex.test(mergeRequestTitle);
    if (!isMrTitleValid) allRulesValid = false;
    rulesMessage += `${isMrTitleValid ? ':white_check_mark:' : ':x:'} ${mrTitleRule.name} ${mrTitleRule.pattern}\n\n`;
  }

  // Check branch name
  const branchRule = config.branch_name;
  if (branchRule) {
    const branchRegex = new RegExp(branchRule.pattern);
    const isBranchValid = branchRegex.test(branch);
    if (!isBranchValid) allRulesValid = false;
    rulesMessage += `${isBranchValid ? ':white_check_mark:' : ':x:'} ${branchRule.name} ${branchRule.pattern}\n\n`;
  }

  // Check commit messages
  const commitsRule = config.commit_message;
  if (commitsRule) {
    const commitsRegex = new RegExp(commitsRule.pattern);
    commits.forEach((commit) => {
      const isCommitsValid = commitsRegex.test(commit);
      rulesMessage += `${isCommitsValid ? ':white_check_mark:' : ':x:'} ${commitsRule.name} ${commitsRule.pattern}\n\n`;
      if (!isCommitsValid) allRulesValid = false;
    });
  }

  if (allRulesValid) {
    body += `${config.success}\n\n`;
  } else {
    body += `${config.failed}\n\n`;
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

  return [null, true];
}
