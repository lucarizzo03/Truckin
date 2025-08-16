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
    try {
      // 1. embed message (safe extraction)
      const embedRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: message
      });
      const userEmbedding = embedRes?.data?.[0]?.embedding;
      if (!userEmbedding) {
        console.error("Embedding creation failed:", embedRes);
        return { content: [{ type: "text", text: "Failed to create embedding." }] };
      }

      // 2. vector RPC
      const { data: relevantLoads, error } = await supabase.rpc("match_loads", {
        query_embedding: userEmbedding,
        match_count: 5
      });

      if (error) {
        console.error("Vector search error:", error);
        return { content: [{ type: "text", text: `Vector search error: ${String(error)}` }] };
      }

      const hits = Array.isArray(relevantLoads) ? relevantLoads : [];

      // derive ids and optionally fetch full rows
      const ids = hits.map((h: any) => h.id ?? h.load_id ?? h.metadata?.id ?? h.payload?.id).filter(Boolean);
      console.error("derived ids from RPC hits:", ids);

      let rows: any[] = [];
      if (ids.length) {
        const { data, error: fetchErr } = await supabase.from("loads").select("*, metadata").in("id", ids);
        if (fetchErr) {
          console.error("fetch by id error:", fetchErr);
        } else {
          rows = Array.isArray(data) ? data : [];
        }
      }

      const loads = rows.length ? rows : hits;
      console.error("final loads used for output:", JSON.stringify(loads, null, 2));

      const content = loads.length
        ? `Found ${loads.length} loads:\n` +
          loads
            .map((l: any, idx: number) => {
              const meta = l.metadata;
              const id = meta.id ?? `(load-${idx + 1})`;
              const pay = meta.pay ?? "(no pay)";
              const broker = meta.broker ?? "(no broker)";
              const pickup = meta.pickup ?? "(unknown pickup)";
              const delivery = meta.delivery ?? "(unknown delivery)";
              const distance = meta.distance ?? "(unknown distance)";
              const loadType = meta.loadType ?? "(unknown type)";
              const equipment = meta.equipment ?? "(unknown equipment)";
              const pickupTime = meta.pickupTime ?? "(unknown time)";
              const urgent =  (meta.urgent) ? " (URGENT)" : "";

              return `${id}${urgent} • ${pay} • ${broker} • ${pickup} → ${delivery} • ${distance} • ${loadType} • ${equipment} • ${pickupTime}`;
            })
            .join("\n")
        : "No loads found.";
      return { content: [{ type: "text", text: `Received message: ${content}` }] };
    }
    catch(err){
      console.error("RAG pipeline error:", err);
      return { content: [{ type: "text", text: `RAG pipeline error: ${String(err)}` }] };
    }
  }
);


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