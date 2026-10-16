#!/usr/bin/env node

import { FafMcpServer } from './server.js';
import { getVersion } from './version.js';

const HELP = `faf-mcp — MCP server for FAF (project.faf, IANA application/vnd.faf+yaml)

Usage:
  faf-mcp              Serve MCP over stdio (what MCP clients run)
  faf-mcp --version    Print the version (-v, -V)
  faf-mcp --help       Print this help (-h)

Run on its own, it waits silently for an MCP client. That's correct; Ctrl+C to quit.

Add it to a client:
  claude mcp add faf -- npx -y faf-mcp
  { "mcpServers": { "faf": { "command": "npx", "args": ["-y", "faf-mcp"] } } }

https://github.com/Wolfe-Jam/faf-mcp`;

/**
 * `--version` / `--help` answer and exit before the server starts, so stdout
 * carries only the answer (#94). Any other argument starts the server as
 * before, so existing client configs don't change.
 */
function handleFlags(argv: string[]): number | null {
  const arg = argv[2];
  if (arg === '--version' || arg === '-v' || arg === '-V') {
    console.log(`faf-mcp ${getVersion()}`);
    return 0;
  }
  if (arg === '--help' || arg === '-h') {
    console.log(HELP);
    return 0;
  }
  return null;
}

// MCP servers run via stdio transport when launched by your MCP host
async function main() {
  const code = handleFlags(process.argv);
  if (code !== null) {
    process.exit(code);
  }

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
