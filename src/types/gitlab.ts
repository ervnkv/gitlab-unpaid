import {
  WebhookMergeRequestEventSchema,
  WebhookEmojiEventSchema,
  WebhookPushEventSchema,
  ExpandedUserSchema,
  Camelize,
  DiscussionNoteSchema,
  MergeRequestSchema,
} from '@gitbeaker/rest';

export type EventEmoji = WebhookEmojiEventSchema;

export type EventMergeRequest = WebhookMergeRequestEventSchema;

export type EventPush = WebhookPushEventSchema;

export type GitlabEvent = EventEmoji | EventMergeRequest | EventPush;

export type User = Camelize<ExpandedUserSchema> | ExpandedUserSchema;

export type MergeRequest = MergeRequestSchema | Camelize<MergeRequestSchema>;

export type Thread = DiscussionNoteSchema & {
  discussionId: string;
  noteId: number;
};
