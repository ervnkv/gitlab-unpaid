import dotenv from 'dotenv';

import { ConfigManager } from './config';
import { GitLabClient } from './gitlab';
import { HandlerManager } from './handlers';
import { WebhookService } from './webhooks';

dotenv.config({ quiet: true });

const GITLAB_HOST = process.env.GITLAB_HOST || 'https://gitlab.com';
const GITLAB_PRIVATE_TOKEN = process.env.GITLAB_PRIVATE_TOKEN;
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3000', 10);
const WEBHOOK_SECRET_TOKEN = process.env.WEBHOOK_SECRET_TOKEN;
const CONFIG_URL = process.env.CONFIG_URL;

// Checks for required environment variables
if (!GITLAB_PRIVATE_TOKEN) {
  console.error('⚠️\tError: env GITLAB_PRIVATE_TOKEN does not provide');
  process.exit();
}

if (!WEBHOOK_SECRET_TOKEN) {
  console.error('⚠️\tError: env WEBHOOK_SECRET_TOKEN does not provide');
  process.exit();
}

if (!CONFIG_URL) {
  console.error('⚠️\tError: env CONFIG_URL does not provide');
  process.exit();
}

// Initialize the configuration manager
const configManager = new ConfigManager(CONFIG_URL);

// Initialize the GitLab client
const gitlabClient = new GitLabClient(GITLAB_HOST, GITLAB_PRIVATE_TOKEN);

// Initialize the handler
const handlerManager = new HandlerManager(gitlabClient, configManager);

// Initialize and start the webhook service
const webhookService = new WebhookService(
  WEBHOOK_PORT,
  WEBHOOK_SECRET_TOKEN,
  handlerManager.handleEvent,
);

async function run() {
  const [configError] = await configManager.setConfig();

  if (configError) {
    console.error(`⚠️\tError: cannot set config:`, configError.text);
    process.exit();
  }

  const [gitlabUserError] = await gitlabClient.setUser();

  if (gitlabUserError) {
    console.error('⚠️\tError: cannot set config:', gitlabUserError.text);
    process.exit();
  }

  const [webhookError] = webhookService.start();

  if (webhookError) {
    console.error('⚠️\tError: cannot start webhook:', webhookError.text);
    process.exit();
  }

  console.log(`🚀\tGitLab Unpaid running on ${WEBHOOK_PORT}`);
}

run();
