export interface AppConfig {
  environment: string;
  cosmosEndpoint: string | undefined;
  cosmosConnectionString: string | undefined;
  cosmosDatabase: string;
}

export function requireSetting(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    environment: env.AZURE_FUNCTIONS_ENVIRONMENT ?? 'Production',
    cosmosEndpoint: env.COSMOSDB_ENDPOINT,
    cosmosConnectionString: env.COSMOSDB_CONNECTION_STRING,
    cosmosDatabase: env.COSMOSDB_DATABASE ?? 'honkbal',
  };
}

export function validateProviderConfig(config: AppConfig): void {
  if (config.environment === 'Development') {
    if (!config.cosmosConnectionString) {
      throw new Error('COSMOSDB_CONNECTION_STRING is required in Development');
    }
    return;
  }

  if (!config.cosmosEndpoint) {
    throw new Error('COSMOSDB_ENDPOINT is required outside Development');
  }
}
