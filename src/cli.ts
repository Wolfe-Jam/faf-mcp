#!/usr/bin/env node

import { FafMcpServer } from './server';

async function main() {
  const server = new FafMcpServer({
    transport: 'stdio',
    fafEnginePath: 'faf',
    debug: true,
    cors: true
  });

  await server.start();

  // stderr: stdout is the JSON-RPC stream in stdio mode.
  console.error('FAF MCP Server started in stdio mode');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
