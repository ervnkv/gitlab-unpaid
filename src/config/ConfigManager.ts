import fs from 'fs';
import path from 'path';

import { BotConfig, WithErr, ProjectConfig, BotConfigSchema } from '../types';
import { err, withErr } from '../utils';

export class ConfigManager {
  private config: BotConfig | null = null;
  private configPath: string;

  constructor(configFileName: string) {
    this.configPath = path.resolve(process.cwd(), configFileName);
  }

  public setConfig(): WithErr<true> {
    const [rawConfigError, rawConfig] = withErr(() => {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    });

    if (rawConfigError) {
      return [err('Cannot read config.json')];
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
