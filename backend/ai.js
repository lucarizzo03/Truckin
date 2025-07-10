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

const cityRegex = /loads? to ([a-zA-Z\s]+)[?.!]?/i;
const acceptLoadRegex = /accept (?:the )?load ([a-zA-Z0-9]+)/i;

// Remove backend-side city filtering and let the AI handle all queries
// Limit loads to 12 and format as a readable list in the system prompt

function formatLoadsForPrompt(loads) {
    return loads.map(load =>
        `- ${load.id}: ${load.pickup} → ${load.delivery} | $${load.pay} | ${load.pickupTime}${load.urgent ? ' | URGENT' : ''}`
    ).join("\n");
}

async function generateChatResponse(userMessage, conversationHistory = [], currentLoads = []) {
    try {
        userMessage = typeof userMessage === "string" ? userMessage : "";
        conversationHistory = (conversationHistory || []).filter(
            m => typeof m.content === "string"
        );
        const safeLoads = Array.isArray(currentLoads) ? currentLoads.slice(0, 12) : [];
        const formattedLoads = formatLoadsForPrompt(safeLoads);
        const systemPrompt = `You are an AI assistant for AutoPilot, a trucking management app.

You have access to the following available loads:
${formattedLoads}

When the user wants to accept a load (for example, after asking for the highest paying load or a specific load), ALWAYS use the accept_load function call with the load ID and a confirmation message. Do not just reply in text—use the function call so the app can process the action.

When listing loads, ALWAYS include the load ID. When the user refers to 'the highest one', 'the first one', or similar, infer the correct load ID from the previous list and use it in the function call.

When the user asks about loads, ALWAYS:
- Filter the loads based on their request (city, state, pay, urgency, ID, etc.).
- List the matching loads in a clear, readable format, showing: ID, pickup, delivery, pay, pickup time, and urgency if present.
- If no loads match, say so.
- If the user wants to accept a load, use the accept_load function call.
- If the user asks for details about a load, show all info for that load.
- If the user asks for the highest paying or urgent loads, show those.
- Do not say 'I'm here to help.'

Examples:
User: "Show me the highest paying loads to Miami"
Response:
Here are the highest paying loads to Miami:
- L010: Charlotte, NC → Miami, FL | $2400 | Tomorrow 6:00 AM
- L006: Atlanta, GA → Miami, FL | $2100 | Today 3:00 PM

User: "Accept the highest one"
Response:
(Function call: accept_load with loadId: L010, confirmation: "Accepting the highest paying load L010 for you now.")

User: "Book the highest paying load"
Response:
(Function call: accept_load with loadId: L011, confirmation: "The highest paying load is L011: Chicago, IL → Dallas, TX | $2800 | Today 1:00 PM. Accepting this load for you now.")

User: "Show me loads to Chicago"
Response:
Here are loads to Chicago:
- L001: Minneapolis, MN → Chicago, IL | $1300 | Today 2:00 PM
- L002: Detroit, MI → Chicago, IL | $1800 | Today 4:30 PM

User: "Show me urgent loads"
Response:
Here are urgent loads:
- L003: Indianapolis, IN → Chicago, IL | $950 | Tomorrow 8:00 AM | URGENT
- L005: St. Louis, MO → Chicago, IL | $1400 | Tomorrow 10:00 AM | URGENT

User: "Show me details for L001"
Response:
Details for L001:
Pickup: Minneapolis, MN
Delivery: Chicago, IL
Pay: $1300
Pickup Time: Today 2:00 PM
Type: Dry Van
Equipment: 53' Dry Van
Broker: Twin Cities Freight
Urgent: Yes
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
                    name: "accept_load",
                    description: "Accept a specific load by ID",
                    parameters: {
                        type: "object",
                        properties: {
                            loadId: {
                                type: "string",
                                description: "The ID of the load to accept"
                            },
                            confirmation: {
                                type: "string",
                                description: "Confirmation message for the user"
                            }
                        },
                        required: ["loadId"]
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
        
        // Check if AI wants to trigger an action
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);
            return {
                text: response.content || getDefaultActionMessage(functionName, functionArgs),
                action: {
                    type: functionName,
                    ...functionArgs
                }
            };
        }

        return {
            text: response.content || "I'm here to help! Please try rephrasing your request.",
            action: null
        };

    } catch (error) {
        console.error('Chat response error:', error);
        throw new Error('Failed to generate response');
    }
}

function getDefaultActionMessage(functionName, args) {
    switch (functionName) {
        case 'accept_load':
            return `Perfect! I'm accepting load ${args.loadId} for you right now.`;
        case 'navigate_to_screen':
            return `Taking you to the ${args.screen} screen now.`;
        case 'show_load_details':
            return `Here are the details for the loads you requested:`;
        default:
            return "Processing your request...";
    }
}

// Main handler for voice-to-chat flow
async function handleVoiceToChat(audioFilePath, conversationHistory = [], currentLoads = []) {
    try {
        // Step 1: Transcribe voice to text
        const transcription = await transcribeVoice(audioFilePath);
        
        // Step 2: Generate AI response
        const aiResponse = await generateChatResponse(transcription, conversationHistory, currentLoads);
        
        // Step 3: Return complete chat exchange
        return {
            success: true,
            userMessage: transcription,
            aiResponse: aiResponse,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
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


// Stream response for real-time chat experience
async function streamChatResponse(userMessage, conversationHistory = []) {
    try {
        const messages = [
            {
                role: "system", 
                content: `You are an AI assistant for AutoPilot, a trucking management app. 
                Help with loads, routes, fuel, compliance, maintenance, and general trucking questions.
                Be helpful, concise, and practical.`
            },
            ...conversationHistory,
            {
                role: "user",
                content: userMessage
            }
        ];

        const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            temperature: 0.7,
            max_tokens: 500,
            stream: true
        });

        return stream;
    } catch (error) {
        console.error('Stream chat error:', error);
        throw error;
    }
}


module.exports = {
    transcribeVoice,
    generateChatResponse,
    handleVoiceToChat,
    streamChatResponse
};