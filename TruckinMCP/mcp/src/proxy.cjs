const express = require('express');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const axios = require('axios')
const crypto = require('crypto'); 
const { OpenAI } = require("openai")
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(bodyParser.json());

// Declare MCP state variables first
let pendingRes = null;
let buffer = '';
let mcpInitialized = false;

const mcp = spawn('node', ['../build/index.js'])

// openai config
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// call this after connecting to MCP
async function discoverTools() {
  try {
    console.log("Discovering available tools");
    const toolsRequest = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/list",
      params: {}
    };
    
    // Send request to MCP server
    mcp.stdin.write(JSON.stringify(toolsRequest) + "\n");
    
    // Response will be handled by your existing stdout handler
  } catch (err) {
    console.error("Error discovering tools:", err);
  }
}

// Add initialization when MCP spawns
mcp.on('spawn', async () => {
    console.log('MCP SPAWNED - INITIALIZING');

    await discoverTools()
    console.log("called discover")
    
    // Wait a moment for MCP to fully start, then mark as initialized
    setTimeout(() => {
        console.log("MARKING MCP AS READY");
        mcpInitialized = true;
        console.log("MCP IS NOW READY FOR REQUESTS");
    }, 2000); // Wait 2 seconds for MCP to start
});


mcp.on('error', (err) => console.error('MCP process error:', err));
mcp.on('exit', (code, signal) => console.log('MCP exited:', code, signal));
mcp.stderr.on('data', (data) => console.error('MCP stderr:', data.toString()));

mcp.stdout.setEncoding('utf8');
mcp.stderr.setEncoding('utf8');

mcp.stdout.on('data', (data) => {
  const rawData = data.toString();
  
  // Skip dotenv messages and other non-JSON output
  if (rawData.includes('[dotenv@') || rawData.includes('injecting env') || rawData.includes('tip:')) {
    console.log('Skipping dotenv output:', rawData);
    return;
  }
  
  // Skip empty or whitespace-only data
  if (!rawData.trim()) {
    return;
  }
  
  try {
    const response = JSON.parse(rawData);
    console.log('=== MCP RESPONSE ===', response);
    
    // Handle the response content properly
    if (response.result && response.result.content) {
      const content = response.result.content[0];
      
      // Check if content is text type (not JSON)
      if (content.type === 'text') {
        // Don't parse as JSON, just use the text directly
        const messageText = content.text;
        console.log('MCP Tool Response:', messageText);
        
        // Send back to frontend using pendingRes
        if (pendingRes) {
          pendingRes.json({ 
            message: messageText,
            success: true 
          });
          pendingRes = null;
        }
      } else {
        // Handle other content types
        if (pendingRes) {
          pendingRes.json({ 
            message: "Tool executed successfully",
            success: true,
            data: content 
          });
          pendingRes = null;
        }
      }
    } else {
      // Fallback for other response types
      if (pendingRes) {
        pendingRes.json({ 
          message: response.result || "Command executed",
          success: true 
        });
        pendingRes = null;
      }
    }
    
  } catch (parseError) {
    console.error('Failed to parse MCP response:', parseError.message);
    console.log('Raw response:', rawData);
    
    // Only try to respond if we have a pending response and it's likely a real error
    if (pendingRes && !rawData.includes('[dotenv@')) {
      pendingRes.json({ 
        message: "Error processing response",
        success: false,
        error: parseError.message
      });
      pendingRes = null;
    }
  }
});

// Helper to send LSP/MCP-style framed messages
function sendMcpMessage(json) {
  const msg = JSON.stringify(json);
  
  console.log("=== SENDING TO MCP ===");
  console.log("Message:", msg);
  
  // Add newline delimiter to the message instead of LSP-style headers
  mcp.stdin.write(msg + '\n');
  console.log("✅ Written to MCP stdin");
}

// cleans user message for later processing
function preProcess(message) {

  // 1. Preprocessing and cleaning
  if (typeof message !== "string") {
    throw new Error("Message is not a string")
  }

  // 2. Length validation (prevent DoS)
  const MAX_MESSAGE_LENGTH = 10000; 
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
  }

  // 3. sanitization -> removes trailing white space
  let cleanMessage = message.trim()

  // 5. protection
  cleanMessage = cleanMessage
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  // 6. Normalize whitespace
  cleanMessage = cleanMessage.replace(/\s+/g, ' ').trim();
  
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
      timestamp: new Date().toISOString()

      // eventually conversation tracking
      // client context

      // add other meta data for tracking


    },
    id: crypto.randomUUID(), // stable, unique per call
  };
}


const systemPrompt = `
You are a JSON-RPC tool router. You MUST respond with ONLY a valid JSON object.

INPUT: A JSON-RPC request object
OUTPUT: A JSON-RPC response object (NO other text)

Available tools:
- "test" (message?: string, number?: number) - Use for messages containing "ping", "test", "hello"
- "RAG" (message: string) - Use for searching loads, finding loads, load queries, or general load information requests
- "BID" (LOADID: string, AMOUNT: number) - Use for placing bids on specific loads

EXAMPLES:

Input: {"jsonrpc":"2.0","method":"parse_content","params":{"message":"test"},"id":"123"}
Output: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"test","arguments":{}},"id":"123"}

Input: {"jsonrpc":"2.0","method":"parse_content","params":{"message":"show me loads from Chicago to Dallas"},"id":"456"}
Output: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"RAG","arguments":{"message":"show me loads from Chicago to Dallas"}},"id":"456"}

Input: {"jsonrpc":"2.0","method":"parse_content","params":{"message":"find high paying loads"},"id":"789"}
Output: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"RAG","arguments":{"message":"find high paying loads"}},"id":"789"}

Input: {"jsonrpc":"2.0","method":"parse_content","params":{"message":"place bid on L009 for 1500"},"id":"101"}
Output: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"BID","arguments":{"LOADID":"L009","AMOUNT":1500}},"id":"101"}

Input: {"jsonrpc":"2.0","method":"parse_content","params":{"message":"bid $2000 on load L017"},"id":"102"}
Output: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"BID","arguments":{"LOADID":"L017","AMOUNT":2000}},"id":"102"}

CRITICAL RULES:
1. You MUST use the correct format: method MUST be "tools/call" and params MUST have "name" and "arguments" fields
2. You MUST preserve the original ID from the input request
3. For messages containing "ping", "test", or "hello", use the "test" tool
4. For messages about searching, finding, showing, or querying loads, use the "RAG" tool
5. For messages about bidding, placing bids, or load bidding, use the "BID" tool
6. Extract LOADID (like "L009", "L017") and AMOUNT (numeric value) from bid messages
7. Pass the entire user message to RAG tool for load searches
8. When in doubt, use the "RAG" tool for load-related queries or "test" tool for general testing
`;



// chat endpoint
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

    // calling LLM for tool identification
    console.log('CALLING LLM');
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(jsonrpc) }
      ],
      temperature: 0,
      max_tokens: 200
    });
    console.log('LLM RESPONSE RECEIVED');


    let rpcResponse;
    try {
      const responseText = aiResponse.choices[0].message.content;
      
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        rpcResponse = JSON.parse(jsonMatch[0]);
        

        if (rpcResponse.id !== jsonrpc.id) {
            console.log(`ID mismatch detected!`);
            console.log(`Original ID: ${jsonrpc.id}`);
            console.log(`LLM returned ID: ${rpcResponse.id}`);
            console.log(`Fixing by restoring original ID`);
            rpcResponse.id = jsonrpc.id; // Replace with original UUID
        }

      } 
      else {
        throw new Error("No JSON found in LLM response");
      }
      
      // Validate JSON-RPC structure -> checking the metadata 
      if (!rpcResponse.jsonrpc || !rpcResponse.method || !rpcResponse.id) {
        throw new Error("Invalid JSON-RPC structure");
      }
      
    } 
    catch (parseError) {
      console.error("LLM response invalid:", parseError.message);
      rpcResponse = {
        jsonrpc: "2.0",
        method: "LLM",
        params: { messages: [{ role: "user", content: cleanMessage }] },
        id: jsonrpc.id
      };
    }


    // Check if MCP is initialized before sending tool calls
    if (!mcpInitialized) {
      return res.status(503).json({ error: "MCP server not initialized yet" });
    }

    pendingRes = res;
    sendMcpMessage(rpcResponse);


    // Add timeout for MCP response
    setTimeout(() => {
      if (pendingRes === res) {
        console.error('=== MCP RESPONSE TIMEOUT ===');
        pendingRes = null;
        res.status(504).json({ error: "MCP response timeout" });
      }
    }, 10000); // 10 second timeout

  }
  catch(err) {
    console.log(err)
    throw new Error("It dont work")
  }

  
});

// to rebuilt typescript -> npx tsc
// to run server -> node src/node proxy.cjs
app.listen(3001, () => {
  console.log('Proxy listening on http://localhost:3001');
});