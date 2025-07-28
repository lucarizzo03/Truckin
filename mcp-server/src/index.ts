import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";


function getServer() {
    const server = new McpServer({
        name: "autopilot",
        version: "1.0.0",
    });


    // make_bids -> MAIN tool right now












    return server
}

const app = express()
app.use(express.json())

app.post('/MCP/chat', async (req: Request, res: Response) => {
    const server = await getServer()

    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
    });

    res.on("close", () => {
        console.log("Req closed"),
        transport.close(),
        server.close()
    })

    res.json({ message: "MCP chat endpoint is working!" });

})

// start with -> node build/index.js

app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});


