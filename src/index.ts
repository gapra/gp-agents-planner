import { McpAgentServer } from "./mcp-server.js";

async function main() {
  try {
    const agentServer = new McpAgentServer();
    await agentServer.start();
  } catch (error) {
    console.error("Fatal error during MCP Server startup:", error);
    process.exit(1);
  }
}

main();