import type { NextConfig } from 'next';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(frontendDir, '../..'),
  reactStrictMode: true,
  transpilePackages: ['@aep-pa/contracts'],
};

export default nextConfig;
