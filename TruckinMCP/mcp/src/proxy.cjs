const express = require('express');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const axios = require('axios')
const crypto = require('crypto'); 
const { OpenAI } = require("openai")

const app = express();
app.use(bodyParser.json());

// Declare MCP state variables first
let pendingRes = null;
let buffer = '';
let contentLength = null;
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


mcp.stdout.on('data', (chunk) => {
  console.log('MCP stdout:', chunk);
  buffer += chunk;
  
  // Process newline-delimited messages
  const messages = buffer.split('\n');
  // Keep the last part in buffer if it doesn't end with newline
  buffer = messages.pop() || '';
  
  // Process each complete message
  for (const message of messages) {
    if (!message.trim()) continue; // Skip empty lines
    
    try {
      const response = JSON.parse(message);
      console.log('=== MCP RESPONSE ===', response);
      
      // Handle response if we have a pending HTTP response waiting
      if (pendingRes) {
        if (response.result) {
          // Handle successful tool call responses
          if (response.result.content && response.result.content.length > 0) {
            // If this is a tools/call response with content
            try {
              // Try to parse the content if it's JSON text
              const contentText = response.result.content[0]?.text;
              if (contentText) {
                const parsedContent = JSON.parse(contentText);
                // Return a cleaner response with the parsed content
                pendingRes.json({
                  jsonrpc: "2.0",
                  result: parsedContent,
                  id: response.id
                });
              } else {
                // Just use the content field directly if there's no text property
                pendingRes.json(response);
              }
            } catch (e) {
              // If parsing fails, return the original response
              console.log('Failed to parse content text:', e);
              pendingRes.json(response);
            }
          } else if (response.result.tools) {
            // This is a tools/list response, pass it through
            pendingRes.json(response);
          } else {
            // Other successful responses
            pendingRes.json(response);
          }
        } else if (response.error) {
          // For error responses, pass through
          pendingRes.json(response);
        } else {
          // For any other response type, pass through
          pendingRes.json(response);
        }
        
        // Clear the pending response after handling
        pendingRes = null;
      }
    } 
    catch (e) {
      console.error('Failed to parse MCP response:', e);
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
- "test" (no params) - ALWAYS use this for messages containing "ping", "test", "hello"

EXAMPLES:

Input: {"jsonrpc":"2.0","method":"parse_content","params":{"message":"test"},"id":"123"}
Output: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"test","arguments":{}},"id":"123"}

Input: {"jsonrpc":"2.0","method":"parse_content","params":{"message":"hello there"},"id":"456"}
Output: {"jsonrpc":"2.0","method":"tools/call","params":{"name":"test","arguments":{}},"id":"456"}

CRITICAL RULES:
1. You MUST use the correct format: method MUST be "tools/call" and params MUST have "name" and "arguments" fields
2. You MUST preserve the original ID from the input request
3. For messages containing "ping", "test", or "hello", use the "test" tool
4. When in doubt, use the "test" tool
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
        { role: "system", content: "You are a JSON-RPC router. Respond ONLY with valid JSON objects. No explanations." },
        { role: "user", content: systemPrompt }
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
// to run server -> node src/node.cjs

app.listen(3001, () => {
  console.log('Proxy listening on http://localhost:3001');
});