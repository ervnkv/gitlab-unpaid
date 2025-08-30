import { Gitlab } from '@gitbeaker/rest';

import { MergeRequest, Thread, User, WithErr } from '../types';
import { err, logger, withErr } from '../utils';

import {
  GetMergeRequestCommitsMessages,
  FindBotThread,
  GetMergeRequestApproversUsernames,
  GetMergeRequestAuthorUsername,
  GetCommitMergeRequests,
  UpsertThread,
} from './types';

export class GitLabClient {
  private api: InstanceType<typeof Gitlab>;
  private user: User | null = null;

  constructor(gitlabHost: string, privateToken: string) {
    this.api = new Gitlab({
      host: gitlabHost,
      token: privateToken,
      camelize: true,
    });
  }

  /**
   * Method to get commits messages from a Merge Request
   */
  public async getCommitMergeRequests({
    projectId,
    commitId,
  }: GetCommitMergeRequests): Promise<WithErr<MergeRequest[]>> {
    logger('started', 'getCommitMergeRequests');

    const [mergeRequestsDataError, mergeRequestsData] = await withErr(() =>
      this.api.Commits.allMergeRequests(projectId, commitId),
    );

    if (mergeRequestsDataError) {
      return [err("Cannot get commit's merge requests")];
    }

    logger('succeed', 'getCommitMergeRequests');

    return [null, mergeRequestsData];
  }

  /**
   * Method to get commits messages from a Merge Request
   */
  public async getMergeRequestCommitsMessages({
    projectId,
    mergeRequestId,
  }: GetMergeRequestCommitsMessages): Promise<WithErr<string[]>> {
    logger('started', 'getMergeRequestCommitsMessages');

    const [commitsDataError, commitsData] = await withErr(() =>
      this.api.MergeRequests.allCommits(projectId, mergeRequestId),
    );

    if (commitsDataError) {
      return [err('Cannot get merge request commits data')];
    }

    const [commitsError, commits] = withErr(() =>
      commitsData.map(({ message }) => message),
    );

    if (commitsError) {
      return [err('Cannot get commits messages')];
    }

    logger('succeed', 'getMergeRequestCommitsMessages');

    return [null, commits];
  }

  /**
   * Get Merge Request author username
   */
  public async getMergeRequestAuthorUsername({
    projectId,
    mergeRequestId,
  }: GetMergeRequestAuthorUsername): Promise<WithErr<string>> {
    logger('started', 'getMergeRequestAuthorUsername');

    const [mergeRequestDataError, mergeRequestData] = await withErr(() =>
      this.api.MergeRequests.show(projectId, mergeRequestId),
    );

    if (mergeRequestDataError) {
      return [err('Cannot get merge request data')];
    }

    const [authorUsernameError, authorUsername] = withErr(
      () => mergeRequestData.author.username,
    );

    if (authorUsernameError) {
      return [err('Cannot get author username')];
    }

    logger('succeed', 'getMergeRequestAuthorUsername');

    return [null, authorUsername];
  }

  /**
   * Get thumbs up on a Merge Request
   */
  public async getMergeRequestApproversUsernames({
    projectId,
    mergeRequestId,
  }: GetMergeRequestApproversUsernames): Promise<WithErr<string[]>> {
    logger('started', 'getMergeRequestApproversUsernames');

    const [emojiDataError, emojiData] = await withErr(() =>
      this.api.MergeRequestAwardEmojis.all(projectId, mergeRequestId),
    );

    if (emojiDataError) {
      return [err('Cannot get merge request emoji data')];
    }

    const [approversUsernamesError, approversUsernames] = withErr(() =>
      emojiData
        .filter((emoji) => emoji.name === 'thumbsup')
        .map((emoji) => emoji.user.username),
    );

    if (approversUsernamesError) {
      return [err('Cannot get emoji usernames')];
    }

    logger('succeed', 'getMergeRequestApproversUsernames');

    return [null, approversUsernames];
  }

  /**
   * Find a bot thread by its identifier
   */
  public async findBotThread({
    projectId,
    mergeRequestId,
    identifier,
  }: FindBotThread): Promise<WithErr<Thread | null>> {
    logger('started', 'findBotThread');

    const [discussionsError, discussionsData] = await withErr(() =>
      this.api.MergeRequestDiscussions.all(projectId, mergeRequestId),
    );

    if (discussionsError) {
      return [err('Cannot get merge request discussions data')];
    }

    const [threadError, thread] = withErr(() => {
      for (const discussion of discussionsData) {
        const { id: discussionId, notes = [] } = discussion;

        if (!Array.isArray(notes)) {
          continue;
        }

        const botTread = notes.find((note) => {
          const isBotNote = note.author.id === this.user?.id;
          const isThread = note.resolvable === true;
          const isIdentifier = note.body.startsWith(identifier);
          return isBotNote && isThread && isIdentifier;
        });

        if (botTread) {
          return { ...botTread, discussionId, noteId: botTread.id };
        }
      }
    });

    if (threadError) {
      return [err('Cannot get thread')];
    }

    logger('succeed', 'findBotThread');

    return [null, thread ?? null];
  }

  /**
   * Update / create a thread
   */
  public async updateTread({
    projectId,
    mergeRequestId,
    body,
    discussionId,
    noteId,
    resolved,
  }: UpsertThread): Promise<WithErr<true>> {
    logger(
      'started, ' +
        JSON.stringify(
          {
            projectId,
            mergeRequestId,
            body,
            discussionId,
            noteId,
            resolved,
          },
          null,
          2,
        ),
      'updateTread',
    );

    logger('isExist: ' + Boolean(discussionId && noteId), 'updateTread');

    // Редактируем существующий тред
    if (discussionId && noteId) {
      const [discussionsError, discussionData] = await withErr(() =>
        this.api.MergeRequestDiscussions.show(
          projectId,
          mergeRequestId,
          discussionId,
        ),
      );

      if (discussionsError) {
        return [err('Cannot get existing thread discussion')];
      }

      logger(
        'discussionData: ' + JSON.stringify(discussionData, null, 2),
        'updateTread',
      );

      const notes = Array.isArray(discussionData.notes)
        ? discussionData.notes
        : [];
      const note = notes.find(({ id }) => id === noteId);

      if (!note) {
        return [err('Cannot get existing thread note')];
      }

      logger('note: ' + JSON.stringify(note, null, 2), 'updateTread');

      if (note.body.trim() !== body.trim()) {
        logger('edit body', 'updateTread');

        const [editExistThreadBodyError] = await withErr(() =>
          this.api.MergeRequestDiscussions.editNote(
            projectId,
            mergeRequestId,
            discussionId,
            noteId,
            { body },
          ),
        );

        if (editExistThreadBodyError) {
          return [err('Cannot edit existing thread')];
        }
      }

      if (note.resolved !== resolved) {
        logger('edit resolve', 'updateTread');

        const [resolveExistThreadError] = await withErr(() =>
          this.api.MergeRequestDiscussions.editNote(
            projectId,
            mergeRequestId,
            discussionId,
            noteId,
            { resolved },
          ),
        );

        if (resolveExistThreadError) {
          return [err('Cannot resolve existing thread')];
        }
      }

      return [null, true];
    }

    // Создаем новый тред
    const [newDiscussionError, newDiscussionData] = await withErr(() =>
      this.api.MergeRequestDiscussions.create(projectId, mergeRequestId, body),
    );

    if (newDiscussionError) {
      return [err('Cannot create new thread')];
    }

    const notes = Array.isArray(newDiscussionData.notes)
      ? newDiscussionData.notes
      : [];
    const note = notes[0];

    if (!note) {
      return [err('Cannot get new thread note')];
    }

    if (note.resolved !== resolved) {
      logger('edit resolve new thread', 'updateTread');

      const [resolveExistThreadError] = await withErr(() =>
        this.api.MergeRequestDiscussions.editNote(
          projectId,
          mergeRequestId,
          newDiscussionData.id,
          note.id,
          { resolved },
        ),
      );

      if (resolveExistThreadError) {
        return [err('Cannot resolve new thread')];
      }
    }

    logger('succeed', 'updateTread');

    return [null, true];
  }

  /**
   * Get current user
   */
  public async setUser(): Promise<WithErr<true>> {
    const [userError, userData] = await withErr(() =>
      this.api.Users.showCurrentUser(),
    );

    if (userError) {
      return [err('Cannot get user data')];
    }

    this.user = userData;

    return [null, true];
  }
}
