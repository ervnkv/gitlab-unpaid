import { ConfigManager } from '../config';
import { GitLabClient } from '../gitlab';
import { GitlabEvent } from '../types';
import { withErr } from '../utils';

import { emojiHandler } from './emojiHandler';
import { mergeRequestHandler } from './mergeRequestHandler';

export class HandlerManager {
  constructor(
    private gitlabClient: GitLabClient,
    private configManager: ConfigManager,
  ) {}

  public handleEvent = async (event: GitlabEvent) => {
    if (event.object_kind === 'emoji') {
      const [emojiHandlerError] = await withErr(
        () => emojiHandler(this.gitlabClient, this.configManager, event),
        'emojiHandler',
      );

      if (emojiHandlerError) {
        console.error('Error in emoji event handler: ', emojiHandlerError.text);
      }
    } else if (event.object_kind === 'merge_request') {
      const [mergeRequestHandlerError] = await withErr(() =>
        mergeRequestHandler(this.gitlabClient, this.configManager, event),
      );

      if (mergeRequestHandlerError) {
        console.error(
          'Error in merge request event handler: ',
          mergeRequestHandlerError.text,
        );
      }
    }
  };
}
