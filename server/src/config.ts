import dotenv from 'dotenv';
import path from 'path';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface AppConfig {
  port: number;
  haBaseUrl: string;
  haToken: string;
}

const resolveEnvFile = () => {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  return path.resolve(process.cwd(), envFile);
};

dotenv.config({ path: resolveEnvFile() });

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new ConfigError(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const getConfig = (): AppConfig => {
  const haBaseUrl = requireEnv('HA_BASE_URL');
  const haToken = requireEnv('HA_TOKEN');
  const portValue = process.env.PORT ?? '4000';
  const port = Number.parseInt(portValue, 10);

  if (Number.isNaN(port)) {
    throw new ConfigError(`Invalid PORT value: ${portValue}`);
  }

  return {
    port,
    haBaseUrl,
    haToken,
  };
};
