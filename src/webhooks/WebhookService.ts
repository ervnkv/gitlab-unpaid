import express, { Request, Response } from 'express';

import { GitlabEvent, WithErr } from '../types';
import { err, logger, withErr } from '../utils';

export class WebhookService {
  private app: express.Application;
  private port: number;
  private secretToken: string;

  private eventEmitter: (event: GitlabEvent) => Promise<void>;

  constructor(
    port: number,
    secretToken: string,
    eventEmitter: (event: GitlabEvent) => Promise<void>,
  ) {
    this.app = express();
    this.port = port;
    this.secretToken = secretToken;
    this.eventEmitter = eventEmitter;
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use(express.json());

    this.app.post('/webhook', async (req: Request, res: Response) => {
      const [webhookError] = await withErr(async () => {
        const gitlabToken = req.headers['x-gitlab-token'];
        if (this.secretToken && gitlabToken !== this.secretToken) {
          return res.status(401).send('Unauthorized');
        }

        const event: GitlabEvent = req.body;

        logger(JSON.stringify(event, null, 2), 'webhook event');

        await this.eventEmitter(event);

        return res.status(200).send('Webhook received and processed.');
      });

      if (webhookError) {
        console.error('Failed to response on webhook', webhookError.text);
      }
    });
  }

  public start(): WithErr<true> {
    const [startError] = withErr(() => this.app.listen(this.port));

    if (startError) {
      return [err('Failed to start webhook server')];
    }

    return [null, true];
  }
}
