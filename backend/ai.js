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


// AI chat response for trucking response
// ...existing code...

// Enhanced AI chat response that can handle load actions
async function generateChatResponse(userMessage, conversationHistory = [], currentLoads = []) {
    try {
        const messages = [
            {
                role: "system", 
                content: `You are an AI assistant for AutoPilot, a trucking management app. 
                
                You have access to current available loads and can help drivers:
                1. Find and filter loads
                2. Accept loads directly through chat
                3. Get load details
                4. Navigate to screens
                
                Available loads: ${JSON.stringify(currentLoads)}
                
                When users want to accept a load, respond with an action to accept it.
                When they ask about loads, you can show them details and offer to accept.
                
                Examples:
                "Accept the Dallas load" -> Find Dallas load and accept it
                "Book the highest paying load" -> Accept the load with highest pay
                "I'll take load L001" -> Accept load with ID L001
                "Show me loads to Miami" -> Filter and display Miami loads with option to accept`
            },
            ...conversationHistory,
            {
                role: "user",
                content: userMessage
            }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
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
            text: response.content,
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
async function handleVoiceToChat(audioFilePath, conversationHistory = []) {
    try {
        // Step 1: Transcribe voice to text
        const transcription = await transcribeVoice(audioFilePath);
        
        // Step 2: Generate AI response
        const aiResponse = await generateChatResponse(transcription, conversationHistory);
        
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
            model: "gpt-4",
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