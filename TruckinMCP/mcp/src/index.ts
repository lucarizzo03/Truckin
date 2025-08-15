import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { OpenAI } from "openai";
import { supabase } from "./mcpSupabase.js"

// init openai
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// Create server instance
const server = new McpServer({
  name: "mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});


// RAG pipeline
server.tool(
  "RAG",
  "Tool that calls RAG pipeline to pull whatever info is asked via the user message",
  {
    message: z.string().describe("the user inputted message that is broken down using RAG")
  },
  async ({ message }) => {
    console.error("RAG CALLED")

    try {
      // 1. embed message
      const { data: embedData } = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: message
        });
        const userEmbedding = embedData[0].embedding;

        // 2. Query Supabase for top 5 similar loads
        const { data: relevantLoads, error } = await supabase.rpc('match_loads', {
            query_embedding: userEmbedding,
            match_count: 5
        });

        if (error) {
        console.error('Vector search error:', error);
        }

        return relevantLoads
    }
    catch(err) {
      throw console.error("RAG doesnt work", err)
    }
  }
)


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