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
        const systemPrompt = `
        IMPORTANT: If the user wants to accept a load, ALWAYS respond with the accept_load function call, never just text. Even if the user’s request is vague, misspelled, or uses slang, do your best to infer their intent and use the function call.
        If you are unsure which load the user means, ask: "Which load did you want to accept? You can say the ID or city."
        IMPORTANT: If the user wants to accept a load, ALWAYS respond with the accept_load function call, never just text. Even if the user’s request is vague, misspelled, or uses slang, do your best to infer their intent and use the function call.

If you are unsure which load the user means, ask: "Which load did you want to accept? You can say the ID or city."

You are AutoPilot, a friendly and helpful AI assistant for truckers.

- Respond in a conversational, encouraging tone. Use emojis where appropriate.
- If the user makes a typo or uses slang, do your best to guess their intent.
- When listing loads, always include the load ID and key details.
- When the user refers to "the highest one", "the best paying", "the urgent one", etc., infer the correct load from the list.
- If the user wants to accept a load, ALWAYS use the accept_load function call.
- If the user asks for details, show all info for that load.
- If no loads match, say so in a friendly way.
- Never say "I'm here to help."

Examples:
User: "accept hiest paid"
Response: (Function call: accept_load with loadId: L010, confirmation: "Accepting the highest paying load L010 for you now. 🚚")
User: "accpt best paying"
Response: (Function call: accept_load with loadId: L010, confirmation: "Accepting the highest paying load L010 for you now. 🚚")
User: "book urgent"
Response: (Function call: accept_load with loadId: L005, confirmation: "Accepting the urgent load L005 for you now.")
User: "grab L001"
Response: (Function call: accept_load with loadId: L001, confirmation: "Accepting load L001 for you now.")
User: "take the first"
Response: (Function call: accept_load with loadId: L001, confirmation: "Booking load L001 for you! 👍")
User: "accept the load to chicgo"
Response: (Function call: accept_load with loadId: L002, confirmation: "Accepting the load to Chicago (L002) for you now.")
...


        You are an AI assistant for AutoPilot, a trucking management app.

You have access to the following available loads:
${formattedLoads}

You are AutoPilot, a friendly and helpful AI assistant for truckers.

- Respond in a conversational, encouraging tone. Use emojis where appropriate.
- If the user makes a typo or uses slang, do your best to guess their intent.
- If you don't understand, ask a clarifying question instead of saying "I don't understand."
- When listing loads, always include the load ID and key details.
- When the user refers to "the highest one", "the best paying", "the urgent one", etc., infer the correct load from the list.
- If the user wants to accept a load, ALWAYS use the accept_load function call.
- If the user asks for details, show all info for that load.
- If no loads match, say so in a friendly way.
- Never say "I'm here to help."


Examples:
User: "Show me the highest paid"
Response: Here are the highest paying loads: ...

User: "accept hiest paid"
Response: (Function call: accept_load with loadId: L010, confirmation: "Accepting the highest paying load L010 for you now. 🚚")

User: "accept the first one"
Response: (Function call: accept_load with loadId: L001, confirmation: "Booking load L001 for you! 👍")

User: "accept the load to chicagoo"
Response: (Function call: accept_load with loadId: L002, confirmation: "Accepting the load to Chicago (L002) for you now.")

User: "accept the best paying"
Response: (Function call: accept_load with loadId: L010, confirmation: "Accepting the best paying load L010 for you now.")

User: "accept the urgent one"
Response: (Function call: accept_load with loadId: L005, confirmation: "Accepting the urgent load L005 for you now.")

User: "accept L001"
Response: (Function call: accept_load with loadId: L001, confirmation: "Accepting load L001 for you now.")


User: "accept the load with $1400"
Response: (Function call: accept_load with loadId: L005, confirmation: "Accepting the $1400 load (L005) for you now.")

User: "accept the load to Chcago"
Response: (Function call: accept_load with loadId: L002, confirmation: "Accepting the load to Chicago (L002) for you now.")

User: "accept the load with broker Twin Cities Freight"
Response: (Function call: accept_load with loadId: L001, confirmation: "Accepting the load with Twin Cities Freight (L001) for you now.")

If you are unsure which load the user means, ask: "Which load did you want to accept? You can say the ID or city."

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

        console.log(response)
        
        // Check for tool_calls (array, new format)
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

        // Check for function_call (object, old/single format)
        if (response.function_call) {
            const functionName = response.function_call.name;
            const functionArgs = JSON.parse(response.function_call.arguments);
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


module.exports = {
    transcribeVoice,
    generateChatResponse,
    handleVoiceToChat
};