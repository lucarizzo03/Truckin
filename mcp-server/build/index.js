"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const supabaseClientTS_1 = require("./supabaseClientTS");
const server = new mcp_js_1.McpServer({
    name: "autopilot",
    version: "1.0.0",
});
server.tool("make_bid", async (extra) => {
    const { loadId, bidAmount, confirmation } = extra.args ?? {};
    console.log("make_bid tool called", { loadId, bidAmount, confirmation });
    const insertObj = {
        load_id: loadId,
        bid_amount: Number(bidAmount),
        user_id: null,
        created_at: new Date().toISOString()
    };
    if (confirmation !== undefined && confirmation !== null) {
        insertObj.confirmation = confirmation;
    }
    const { data: bidData, error: bidError } = await supabaseClientTS_1.supabase
        .from('bids')
        .insert([insertObj]);
    console.log('Supabase insert response:', { bidData, bidError });
    let bids = [];
    let bidResult = null;
    if (bidError) {
        bidResult = { success: false, error: bidError.message };
    }
    else {
        bidResult = { success: true, bid: bidData };
        const { data: allBids, error: allBidsError } = await supabaseClientTS_1.supabase
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
const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
    sessionIdGenerator: () => Math.random().toString(36).substring(2)
});
console.log("MCP server running on http://localhost:3001");
