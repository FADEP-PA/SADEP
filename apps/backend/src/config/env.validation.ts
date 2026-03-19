const VALID_NODE_ENVS = ['development', 'test', 'production'] as const;

type NodeEnv = (typeof VALID_NODE_ENVS)[number];

export interface AppEnvironment {
  NODE_ENV: NodeEnv;
  PORT: number;
}

export function validateEnvironmentVariables(config: Record<string, unknown>): AppEnvironment {
  const nodeEnv = String(config.NODE_ENV ?? 'development');

  if (!VALID_NODE_ENVS.includes(nodeEnv as NodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV: ${nodeEnv}. Expected one of ${VALID_NODE_ENVS.join(', ')}.`,
    );
  }

  const parsedPort = Number(config.PORT ?? 3000);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(`Invalid PORT: ${String(config.PORT ?? '')}. Expected an integer between 1 and 65535.`);
  }

  return {
    NODE_ENV: nodeEnv as NodeEnv,
    PORT: parsedPort,
  };
}
