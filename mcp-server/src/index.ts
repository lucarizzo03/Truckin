import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { supabase } from "./supabaseClientTS";


function getServer() {
    const server = new McpServer({
        name: "autopilot",
        version: "1.0.0",
    });


    // make bid tool call
    server.tool("make_bid", async (extra) => {
        const { loadId, bidAmount, confirmation, userId } = (extra as any).args ?? {};

        // Insert bid into DB
        const { data: bidData, error: bidError } = await supabase
            .from('bids')
            .insert([
                {
                    load_id: loadId,
                    bid_amount: bidAmount,
                    confirmation,
                    user_id: userId || null,
                    created_at: new Date().toISOString()
                }
            ]);

        let bids = [];
        let bidResult = null;

        if (bidError) {
            bidResult = { success: false, error: bidError.message };
        } else {
            bidResult = { success: true, bid: bidData };
            // Fetch all bids for this user (or all bids if userId not provided)
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

    // more tools here 
    













    
    return server
}

const app = express()
app.use(express.json())

app.post('/MCP/chat', async (req: Request, res: Response) => {
    const { tool, args } = req.body;
    
    if (!tool) {
        return res.status(400).json({ error: "Tool name is required" });
    }
    
    const server = await getServer()
    
    // Find the tool handler and execute it
    if (typeof (server as any)._tools?.[tool] === "function") {
        try {
            // The SDK expects an "extra" object, so we mimic that
            const result = await (server as any)._tools[tool]({ args });
            res.json(result);
        } 
        catch (err: any) {
            res.status(500).json({ error: "Tool execution failed", details: err?.message });
        }
    } 
    else {
        res.status(404).json({ error: `Tool '${tool}' not found` });
    }
})

// start with -> node build/index.js

app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});


