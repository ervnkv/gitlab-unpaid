import fetch from 'node-fetch';

import { BotConfig, WithErr, ProjectConfig, BotConfigSchema } from '../types';
import { err, withErr } from '../utils';

export class ConfigManager {
  private config: BotConfig | null = null;

  constructor(private url: string) {}

  public async setConfig(): Promise<WithErr<true>> {
    const [rawConfigError, rawConfig] = await withErr(async () => {
      const response = await fetch(this.url);
      return await response.json();
    });

    if (rawConfigError) {
      return [err('Cannot read config.json from URL')];
    }

    const [configError, config] = withErr(() =>
      BotConfigSchema.parse(rawConfig),
    );

    if (configError) {
      return [err('Invalid config schema')];
    }

    this.config = config;

    return [null, true];
  }

  public getProjectConfig(projectIdOrPath: string): WithErr<ProjectConfig> {
    if (!this.config) {
      return [err('Config not found')];
    }

    const projectConfig = this.config.projects[projectIdOrPath];

    if (!projectConfig) {
      return [err('Project config not found')];
    }

    return [null, projectConfig];
  }
}
