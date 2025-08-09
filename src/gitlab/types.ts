export type GetMergeRequestCommitsMessages = {
  projectId: number;
  mergeRequestId: number;
};

export type GetMergeRequestAuthorUsername = {
  projectId: number;
  mergeRequestId: number;
};

export type GetMergeRequestApproversUsernames = {
  projectId: number;
  mergeRequestId: number;
};

export type FindBotThread = {
  projectId: number;
  mergeRequestId: number;
  identifier: string;
};

export type UpsertThread = {
  projectId: number;
  mergeRequestId: number;
  body: string;
  resolved: boolean;
  discussionId: string | undefined;
  noteId: number | undefined;
};
