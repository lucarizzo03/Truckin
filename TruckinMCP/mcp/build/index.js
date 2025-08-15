"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const openai_1 = require("openai");
const mcpSupabase_js_1 = require("./mcpSupabase.js");
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
// RAG pipeline
server.tool("RAG", "Tool that calls RAG pipeline to pull whatever info is asked via the user message", {
    message: zod_1.z.string().describe("the user inputted message that is broken down using RAG")
}, async ({ message }) => {
    console.error("RAG CALLED");
    try {
        // 1. embed message
        const { data: embedData } = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: message
        });
        const userEmbedding = embedData[0].embedding;
        // 2. Query Supabase for top 5 similar loads
        const { data: relevantLoads, error } = await mcpSupabase_js_1.supabase.rpc('match_loads', {
            query_embedding: userEmbedding,
            match_count: 5
        });
        if (error) {
            console.error('Vector search error:', error);
        }
        return relevantLoads;
    }
    catch (err) {
        throw console.error("RAG doesnt work", err);
    }
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
