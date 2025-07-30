import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { supabase } from "./supabaseClientTS";

const server = new McpServer({
  name: "autopilot",
  version: "1.0.0",
});

server.tool("make_bid", async (extra: any) => {
  const { loadId, bidAmount, confirmation } = (extra as any).args ?? {};
  console.log("make_bid tool called", { loadId, bidAmount, confirmation });

  const insertObj: any = {
    load_id: loadId,
    bid_amount: Number(bidAmount),
    user_id: null,
    created_at: new Date().toISOString()
  };
  if (confirmation !== undefined && confirmation !== null) {
    insertObj.confirmation = confirmation;
  }
  const { data: bidData, error: bidError } = await supabase
    .from('bids')
    .insert([insertObj]);
  console.log('Supabase insert response:', { bidData, bidError });

  let bids = [];
  let bidResult = null;

  if (bidError) {
    bidResult = { success: false, error: bidError.message };
  } else {
    bidResult = { success: true, bid: bidData };
    const { data: allBids, error: allBidsError } = await supabase
      .from('bids')
      .select('*')
      .order('created_at', { ascending: false });
    if (!allBidsError && allBids) {
      bids = allBids;
    }
  }

  return {
    content: [
      {
        type: "text",
        text: confirmation || `Bid of $${bidAmount} placed on load ${loadId}`,
      }
    ],
    success: !bidError,
    bidResult,
    bids
  };
});


const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => Math.random().toString(36).substring(2)
});
console.log("MCP server running on http://localhost:3001");