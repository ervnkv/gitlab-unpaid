import {
  WebhookMergeRequestEventSchema,
  WebhookEmojiEventSchema,
  ExpandedUserSchema,
  Camelize,
  DiscussionNoteSchema,
} from '@gitbeaker/rest';

export type EventEmoji = WebhookEmojiEventSchema;

export type EventMergeRequest = WebhookMergeRequestEventSchema;

export type GitlabEvent = EventEmoji | EventMergeRequest;

export type User = Camelize<ExpandedUserSchema> | ExpandedUserSchema;

export type Thread = DiscussionNoteSchema & {
  discussionId: string;
  noteId: number;
};
