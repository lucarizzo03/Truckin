const { OpenAI } = require('openai')
const fs = require('fs')
const { supabase } = require('./supabaseClient')

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
        const systemPrompt = 
        `
        You are AutoPilot, a friendly and helpful AI assistant for truckers using a load-booking app.

        Your job is to help drivers negotiate and place bids using natural language. Respond in a casual, conversational tone and include emojis where appropriate.

        ---

        FLOW:

        1. If the user mentions bidding, offering a price, or negotiating — ALWAYS respond by using the make_bid function call with the correct loadId and bidAmount. Do not just reply in text; use the provided function.
        2. If the user's message is vague (e.g. "that Dallas one", "urgent one"), try to match it to a load using city, urgency, or price.
        3. If the user specifies a load but not a bid amount, ask: "How much would you like to bid on load [ID]?"
        4. If unclear which load, ask: "Which load did you want to bid on? You can say the ID or city."

        ---

        IMPORTANT:
        - When a bid is detected, ALWAYS use the make_bid function call. Do not only reply in text.
        - Your function call should include loadId, bidAmount, and a confirmation message for the user.
        - You may also include a friendly confirmation in your reply, but the function call is required for every bid.

        ---

        AVAILABLE LOADS:

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
        
        // Support both tool_calls (array) and function_call (object)
        let functionName, functionArgs;
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0];
            functionName = toolCall.function.name;
            functionArgs = JSON.parse(toolCall.function.arguments);
        } 
        else if (response.function_call) {
            functionName = response.function_call.name;
            functionArgs = JSON.parse(response.function_call.arguments);
        }
        
        
        if (functionName) {
            
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
    handleVoiceToChat,
    RAG
};