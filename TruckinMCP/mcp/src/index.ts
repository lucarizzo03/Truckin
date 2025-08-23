import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { OpenAI } from "openai";
import { supabase } from "./mcpSupabase.js"
import { pick } from "zod/v4-mini";

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


// places bids tool
// ...existing code...
// places bids tool
server.tool(
  "BID",
  "Tool places bid a specific load",
  {
    LOADID: z.string().describe("The ID of the load to bid on"),
    AMOUNT: z.number().describe("The bid amount in USD")
  },
  async ({ LOADID, AMOUNT }) => {
    try {
      // get load
      const { data: bidLoad, error } = await supabase
      .from('loads')
      .select('*')
      .eq('load_id', LOADID)
      .single()

      if (error) {
        console.error("ISSUE 1")
        return {
          content: [{
            type: "text",
            text: `Error fetching load: ${String(error)}`
          }]
        };
      }

      if (!bidLoad) {
        console.error("ISSUE 2")
        return {
          content: [{
            type: "text",
            text: `Load ${LOADID} not found`
          }]
        };
      }

      const loadMeta = bidLoad.metadata || {}
      const pickup = loadMeta.pickup || 'unknown'
      const delivery = loadMeta.delivery || 'unknown'
      const pay = loadMeta.pay || 'unknown'

      // making new bid
      const { data: newBid, error: bidError } = await supabase
          .from('bids')
          .insert({
            load_id: LOADID,
            bid_amount: AMOUNT,
            confirmation: `Bid placed for $${AMOUNT} on load ${LOADID}`
          })
          .select()
          .single();
        
      if (bidError) {
        console.error('Bid error details:', bidError);
        console.error('Bid error stringified:', JSON.stringify(bidError, null, 2));
        return {
          content: [{
            type: "text",
            text: `Error creating bid: ${bidError.message || bidError.details || JSON.stringify(bidError)}`
          }]
        };
      }


      if (!newBid) {
        console.error("bid did not make")
        return {
          content: [{
            type: "text",
            text: "Bid creation failed"
          }]
        };
      }

      const response = {
          success: true,
          bid: newBid,
          load: {
            id: LOADID,
            pickup: pickup,
            delivery: delivery,
            pay: pay,
            broker: loadMeta.broker || 'Unknown broker',
            distance: loadMeta.distance || 'Unknown distance',
            equipment: loadMeta.equipment || 'Unknown equipment'
          },
          message: `Successfully placed bid of $${AMOUNT} on load ${LOADID} (${pickup} → ${delivery})`
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(response)
          }]
        };

    } catch(err) {
      console.error("place_bid tool error:", err);
      return {
        content: [{
          type: "text",
          text: `Bid placement error: ${String(err)}`
        }]
      };
    }
  }
);


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
      const ids = hits.map((h: any) => h.id ?? h.metadata?.id ?? h.load_id).filter(Boolean);
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
              const meta = l.metadata ?? {};
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