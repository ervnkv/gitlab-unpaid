import { ConfigManager } from '../config';
import { GitLabClient } from '../gitlab';
import { GitlabEvent } from '../types';
import { logger, withErr } from '../utils';

import { emojiHandler } from './emojiHandler';
import { mergeRequestHandler } from './mergeRequestHandler';
import { pushHandler } from './pushHandler';

export class HandlerManager {
  constructor(
    private gitlabClient: GitLabClient,
    private configManager: ConfigManager,
  ) {}

  // TODO Добавить ивент note чтобы запретить резолвить тред
  public handleEvent = async (event: GitlabEvent) => {
    logger(event.object_kind, 'handler manager');

    if (event.object_kind === 'emoji') {
      const [emojiHandlerError] = await withErr(() =>
        emojiHandler(this.gitlabClient, this.configManager, event),
      );

      if (emojiHandlerError) {
        logger(emojiHandlerError.text, 'handler manager', 'error');
      }
    } else if (event.object_kind === 'merge_request') {
      const [mergeRequestHandlerError] = await withErr(() =>
        mergeRequestHandler(this.gitlabClient, this.configManager, event),
      );

      if (mergeRequestHandlerError) {
        logger(mergeRequestHandlerError.text, 'handler manager', 'error');
      }
    } else if (event.object_kind === 'push') {
      const [pushHandlerError] = await withErr(() =>
        pushHandler(this.gitlabClient, this.configManager, event),
      );

      if (pushHandlerError) {
        logger(pushHandlerError.text, 'handler manager', 'error');
      }
    }
  };
}
