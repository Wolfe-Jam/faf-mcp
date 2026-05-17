#!/usr/bin/env node

import { FafMcpServer } from './server.js';

// MCP servers run via stdio transport when launched by your MCP host
async function main() {
  const server = new FafMcpServer({
    transport: 'stdio',
    fafEnginePath: 'faf'
  });

  await server.start();
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});