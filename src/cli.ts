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

  console.log('FAF MCP Server started in stdio mode');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
