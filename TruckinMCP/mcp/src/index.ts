import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create server instance
const server = new McpServer({
  name: "mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});


// test tool
server.tool(
  "test",
  "test tool",
  {
    message: z.string().optional().describe("Optional test message to echo back"),
    number: z.number().optional().describe("Optional test number to echo back")
  },
  async ({ message, number }) => {
    console.error("Test tool called with params:", { message, number });
    
    return {
      content: [
        {
          type: "text",
          text: `Test tool executed successfully!\nReceived message: ${message || "none"}\nReceived number: ${number || "none"}\nTimestamp: ${new Date().toISOString()}`
        }
      ]
    };
  }
);






async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Truckin MCP runnin");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});