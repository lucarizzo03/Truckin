const { OpenAI } = require('openai')
const fs = require('fs')

// config
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

// voice -> text ( whisper-1 )
async function transcribeVoice(audioFilePath) {
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath),
            model: "whisper-1",
            prompt: "This is a trucking app voice command. User might ask about loads, routes, fuel, dispatch, or general trucking questions.",
            response_format: "text",
            temperature: 0.1
        });

        return transcription.trim();
    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error('Failed to transcribe audio');
    }
}

// for an accepetd load - change what it looks like later
function formatLoadsForPrompt(loads) {
    return loads.map(load => {
        const l = load.metadata || load; // Use metadata if present
        return `- ${l.id}: ${l.pickup} → ${l.delivery} | $${l.pay} | ${l.pickupTime}${l.urgent ? ' | URGENT' : ''}`;
    }).join("\n");
}

async function generateChatResponse(userMessage, conversationHistory = [], currentLoads = []) {
    try {
        userMessage = typeof userMessage === "string" ? userMessage : "";
        conversationHistory = (conversationHistory || []).filter(
            m => typeof m.content === "string"
        );
        const safeLoads = Array.isArray(currentLoads) ? currentLoads.slice(0, 12) : [];
        const formattedLoads = formatLoadsForPrompt(safeLoads);
        const systemPrompt = `You are AutoPilot, a friendly and helpful AI assistant for truckers using a load-booking app.

You help drivers **find, bid on ** using natural language through voice or text. Your responses should always be conversational and supportive, using emojis when appropriate.

---

🔁 FLOW OVERVIEW:
1. If the user wants to **see loads**, list them clearly (always include ID, pay, pickup, delivery, urgency, etc.).
2. If the user wants to **bid** (even vaguely: "offer 2600", "can I get more?", etc.), respond with a make_bid function call.
3. If the user wants to **accept** a load, ALWAYS respond with an accept_load function call. Never use plain text to confirm acceptance.
4. If the user refers to loads using vague terms like “the best one”, “the urgent one”, or “the one to Chicago”, infer the load from available options.
5. If you're not sure which load the user means, ask for clarification: "Which load did you want to bid on/accept? You can say the ID or city."
6. Never say “I’m here to help.”
7. Driver's can only accept bids from the BidsScreen

---

FUNCTION RULES:

- Accepting a Load  
  If the user says anything like "accept", "book", "take", "lock in", etc., always respond with:  
  (function_call: accept_load, loadId: $loadId, confirmation: "$userMessage")

- Bidding  
  If the user mentions negotiating price, offering an amount, or asking for more, always respond with:  
  (function_call: make_bid, loadId: $loadId, bidAmount: $amount, confirmation: "$userMessage")

---

INTELLIGENCE TIPS:

- Interpret slang, typos, and casual talk (e.g. “accpt high payin”, “offer 3k for phoenix”, “book that urgent one”).
- Match vague intent to correct load using details like pay, pickup/delivery city, urgency, or broker.
- Always try to keep things smooth and efficient — you're their smart, reliable co-pilot.

---

EXAMPLES:

User: “show me the best paying”
→ "Here’s the highest paying load: [Details]"

User: “can I get 3000 for that Dallas one?”
→ (Function call: make_bid with loadId: L001, bidAmount: 3000, confirmation: "Submitting a bid of $3000 for load L001 to Dallas. 🤝")

User: “offer 2k on that Phoenix job”
→ (Function call: make_bid with loadId: L003, bidAmount: 2000, confirmation: "Placing your $2000 offer on load L003 to Phoenix now.")

---

DO NOT:
- Never confirm load booking or bidding in plain text without using a function call.
- Never ask “How can I help?”
- Never ignore vague or slang inputs — always try to infer.

---

You have access to the following available loads:
${formattedLoads}
`
        const messages = [
            {
                role: "system", 
                content: systemPrompt
            },
            ...conversationHistory,
            {
                role: "user",
                content: userMessage
            }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            temperature: 0.7,
            max_tokens: 500,
            functions: [
                {
                    name: "make_bid",
                    description: "Bid on a specific load by ID",
                    parameters: {
                        type: "object",
                        properties: {
                            loadId: {
                                type: "string",
                                description: "The ID of the load to bid on"
                            },
                            bidAmount: {
                                type: "number", 
                                description: "The bid amount in USD"
                            },
                            confirmation: {
                                type: "string",
                                description: "Confirmation message for the user"
                            }
                        },
                        required: ["loadId", "bidAmount"]
                    }
                },
                {
                    name: "navigate_to_screen",
                    description: "Navigate to a specific screen with parameters",
                    parameters: {
                        type: "object",
                        properties: {
                            screen: {
                                type: "string",
                                enum: ["Loads", "Route", "Finance", "Chat"],
                                description: "The screen to navigate to"
                            },
                            params: {
                                type: "object",
                                description: "Parameters to pass to the screen"
                            }
                        },
                        required: ["screen"]
                    }
                },
                {
                    name: "show_load_details",
                    description: "Display detailed information about specific loads",
                    parameters: {
                        type: "object",
                        properties: {
                            loadIds: {
                                type: "array",
                                items: { type: "string" },
                                description: "Array of load IDs to show details for"
                            }
                        },
                        required: ["loadIds"]
                    }
                }
            ],
            function_call: "auto"
        });

        const response = completion.choices[0].message;

        console.log(response)
        
        // Check for tool_calls (array, new format)
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
        
      

            // Always clean response.content before returning
            const cleanContent = response.content
                ? response.content.replace(/function_call: \w+.*$/gi, '').trim()
                : getDefaultActionMessage(functionName, functionArgs);
            
            

            if (functionName === "make_bid") {
                return {
                    text: cleanContent,
                    action: {
                        type: functionName, 
                        ...functionArgs,
                        next: {
                            type: 'navigate_to_screen',
                            screen: 'Bids'
                        }
                    }
                }
            }

            return {
                text: cleanContent,
                action: {
                    type: functionName,
                    ...functionArgs
                }
            };
        }

        return {
            text: response.content
                ? response.content.replace(/function_call: \w+.*$/gi, '').trim()
                : "Sorry, I couldn't understand your request. Please specify a load, bid amount, or action.",
            action: null
        };
    } 
    catch (error) {
        console.error('Chat response error:', error);
        throw new Error('Failed to generate response');
    }
}

function getDefaultActionMessage(functionName, args) {
    switch (functionName) {
        case 'make_bid':
            return `Submitting your bid${args.bidAmount ? ` of $${args.bidAmount}` : ''} on load ${args.loadId}.`;
        case 'navigate_to_screen':
            return `Taking you to the ${args.screen} screen now.`;
        case 'show_load_details':
            return `Here are the details for the loads you requested:`;
        default:
            return "Processing your request...";
    }
}

// Main handler for voice-to-chat flow
async function handleVoiceToChat(audioFilePath) {
    try {
        // Step 1: Transcribe voice to text
        const transcription = await transcribeVoice(audioFilePath);
        
        // Step 2: Return complete chat exchange
        return {
            success: true,
            userMessage: transcription,
            timestamp: new Date().toISOString()
        };
    } 
    catch (error) {
        console.error('Voice to chat error:', error);
        return {
            success: false,
            error: error.message,
            userMessage: null,
            aiResponse: "Sorry, I couldn't process your voice message. Please try again.",
            timestamp: new Date().toISOString()
        };
    }
}


module.exports = {
    generateChatResponse,
    handleVoiceToChat
};