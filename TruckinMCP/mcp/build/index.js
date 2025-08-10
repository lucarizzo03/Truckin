"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const openai_1 = require("openai");
// init openai
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "mcp",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// test tool
server.tool("test", "test tool", {
    message: zod_1.z.string().optional().describe("Optional test message to echo back"),
    number: zod_1.z.number().optional().describe("Optional test number to echo back")
}, async ({ message, number }) => {
    console.error("Test tool called with params:", { message, number });
    return {
        content: [
            {
                type: "text",
                text: `Test tool executed successfully!\nReceived message: ${message || "none"}\nReceived number: ${number || "none"}\nTimestamp: ${new Date().toISOString()}`
            }
        ]
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Truckin MCP runnin");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
