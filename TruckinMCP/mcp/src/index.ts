import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "";
const USER_AGENT = "";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// test
server.tool(
  "say_hello",
  "Returns a greeting for the given name.",
  {
    name: z.string().describe("Name to greet"),
  },
  async ({ name }) => {
    return {
      content: [
        {
          type: "text",
          text: `Hello, ${name}!`,
        },
      ],
    };
  },
);




// npx tsc -> node build/index.js
async function main() {
  const transport = new StdioServerTransport(); 
  await server.connect(transport);
  console.error("Truckin MCP runnin");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});