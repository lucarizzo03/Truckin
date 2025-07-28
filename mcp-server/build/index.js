"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const express_1 = __importDefault(require("express"));
function getServer() {
    const server = new mcp_js_1.McpServer({
        name: "autopilot",
        version: "1.0.0",
    });
    // make_bids -> MAIN tool right now
    return server;
}
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post('/MCP/chat', async (req, res) => {
    const server = await getServer();
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
        sessionIdGenerator: undefined
    });
    res.on("close", () => {
        console.log("Req closed"),
            transport.close(),
            server.close();
    });
    res.json({ message: "MCP chat endpoint is working!" });
});
app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});
