const express = require('express');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const xss = require('xss');
const validator = require('validator');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const mcp = spawn('node', ['../build/index.js'])

mcp.on('error', (err) => console.error('MCP process error:', err));
mcp.on('exit', (code, signal) => console.log('MCP exited:', code, signal));
mcp.stderr.on('data', (data) => console.error('MCP stderr:', data));

mcp.stdout.setEncoding('utf8');
mcp.stderr.setEncoding('utf8');

let pendingRes = null;
let buffer = '';
let contentLength = null;

mcp.stdout.on('data', (chunk) => {
  console.log('MCP stdout:', chunk);
  buffer += chunk;
  while (true) {
    if (contentLength == null) {
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!match) break;
      contentLength = parseInt(match[1], 10);
      buffer = buffer.slice(match.index + match[0].length);
    }
    if (contentLength != null && buffer.length >= contentLength) {
      const json = buffer.slice(0, contentLength);
      buffer = buffer.slice(contentLength);
      contentLength = null;
      if (pendingRes) {
        try {
          pendingRes.json(JSON.parse(json));
        } catch (e) {
          pendingRes.json({ error: 'Invalid JSON from MCP', raw: json });
        }
        pendingRes = null;
      }
    } else {
      break;
    }
  }
});

// Helper to send LSP/MCP-style framed messages
function sendMcpMessage(json) {
  const msg = JSON.stringify(json);
  const contentLength = Buffer.byteLength(msg, 'utf8');
  const header = `Content-Length: ${contentLength}\r\n\r\n`;
  mcp.stdin.write(header + msg);
}

// cleans user message for later processing
function preProcess(message) {

  // 1. Preprocessing and cleaning
  if (typeof message !== "string") {
    throw new Error("Message is not a string")
  }
  
  let cleanMessage = message.trim()
  
  // strips Urls and potentially dangerous content
  cleanMessage = xss(cleanMessage)
  
  // removes emojis or other control chars
  cleanMessage = validator.stripLow(cleanMessage, true);

  return cleanMessage

}

// enrich metadata
function enrichMetaData(cleanMessage, userContext) {
  return {
    jsonrpc: "2.0",
    method: "parse_content", // LLM will return structured tool call
    params: {
      message: cleanMessage,
      user_id: userContext.user_id || "anonymous",
      session_id: userContext.session_id || "unknown-session",
      timestamp: new Date().toISOString(),
      permissions: userContext.permissions || ["basic_chat"],
    },
    id: crypto.randomUUID(), // stable, unique per call
  };
}


systemPrompt = ``





// to run -> node proxy.cjs
app.post('/chat', async (req, res) => {
  const { message } = req.body

  // extract user context from header
  const userContext = {
    user_id: req.headers['x-user-id'] || "anonymous",
    session_id: req.headers['x-session-id'] || "unknown-session",
    permissions: req.headers['x-permissions'] ? JSON.parse(req.headers['x-permissions']) : ["basic_chat"],
  };

  // preProcess message
  const cleanMessage = preProcess(message)

  // enrich meta data 
  const jsonrpc = enrichMetaData(cleanMessage, userContext)

  console.log(jsonrpc)

  try {
    const aiResponse = await axios.post("http://localhost:8000/pipe", {
      messages: [{ role: "user", content: cleanMessage }],
      prompt: systemPrompt
    })

    console.log(aiResponse.data)
    pendingRes = res;
    sendMcpMessage(aiResponse.data);

  }
  catch(err) {
    console.log(err)
    throw new Error("It dont work")
  }
});

app.listen(3001, () => {
  console.log('Proxy listening on http://localhost:3001');
});



