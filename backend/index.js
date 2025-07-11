const express = require('express');
const cors = require('cors');
require('dotenv').config()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { supabase } = require('./supabaseClient');
const { 
    transcribeVoice, 
    generateChatResponse, 
    handleVoiceToChat, 
    streamChatResponse 
} = require('./ai');


const app = express();

app.use(cors())
app.use(express.json());

// Add endpoint to get current loads
app.get('/api/loads', async (req, res) => {
    try {
        // This would connect to your loads database
        // For now, return the fake loads
        const loads = [
            // Routes TO Chicago (multiple options)
            {
                id: 'L001',
                pickup: 'Minneapolis, MN',
                delivery: 'Chicago, IL',
                pay: 1300,
                distance: '400 miles',
                pickupTime: 'Today 2:00 PM',
                loadType: 'Dry Van',
                equipment: '53\' Dry Van',
                broker: 'Twin Cities Freight',
                urgent: true,
            },
            {
                id: 'L002',
                pickup: 'Detroit, MI',
                delivery: 'Chicago, IL',
                pay: 1800,
                distance: '280 miles',
                pickupTime: 'Today 4:30 PM',
                loadType: 'Reefer',
                equipment: '53\' Reefer',
                broker: 'Great Lakes Logistics',
                urgent: false,
            },
            {
                id: 'L003',
                pickup: 'Indianapolis, IN',
                delivery: 'Chicago, IL',
                pay: 950,
                distance: '180 miles',
                pickupTime: 'Tomorrow 8:00 AM',
                loadType: 'Dry Van',
                equipment: '53\' Dry Van',
                broker: 'Midwest Connect',
                urgent: true,
            },
            {
                id: 'L004',
                pickup: 'Milwaukee, WI',
                delivery: 'Chicago, IL',
                pay: 1100,
                distance: '90 miles',
                pickupTime: 'Today 6:00 PM',
                loadType: 'Flatbed',
                equipment: '48\' Flatbed',
                broker: 'Wisconsin Hauling',
                urgent: false,
            },
            {
                id: 'L005',
                pickup: 'St. Louis, MO',
                delivery: 'Chicago, IL',
                pay: 1400,
                distance: '300 miles',
                pickupTime: 'Tomorrow 10:00 AM',
                loadType: 'Reefer',
                equipment: '53\' Reefer',
                broker: 'Gateway Freight',
                urgent: true,
            },
            
            // Routes TO Miami (multiple options)
            {
                id: 'L006',
                pickup: 'Atlanta, GA',
                delivery: 'Miami, FL',
                pay: 2100,
                distance: '665 miles',
                pickupTime: 'Today 3:00 PM',
                loadType: 'Reefer',
                equipment: '53\' Reefer',
                broker: 'XYZ Transport',
                urgent: false,
            },
            {
                id: 'L007',
                pickup: 'Orlando, FL',
                delivery: 'Miami, FL',
                pay: 1200,
                distance: '230 miles',
                pickupTime: 'Today 5:30 PM',
                loadType: 'Dry Van',
                equipment: '53\' Dry Van',
                broker: 'Sunshine Hauling',
                urgent: true,
            },
            {
                id: 'L008',
                pickup: 'Tampa, FL',
                delivery: 'Miami, FL',
                pay: 950,
                distance: '280 miles',
                pickupTime: 'Tomorrow 9:00 AM',
                loadType: 'Flatbed',
                equipment: '48\' Flatbed',
                broker: 'Gulf Coast Freight',
                urgent: false,
            },
            {
                id: 'L009',
                pickup: 'Jacksonville, FL',
                delivery: 'Miami, FL',
                pay: 1350,
                distance: '350 miles',
                pickupTime: 'Today 7:00 PM',
                loadType: 'Reefer',
                equipment: '53\' Reefer',
                broker: 'Florida Express',
                urgent: true,
            },
            {
                id: 'L010',
                pickup: 'Charlotte, NC',
                delivery: 'Miami, FL',
                pay: 2400,
                distance: '750 miles',
                pickupTime: 'Tomorrow 6:00 AM',
                loadType: 'Dry Van',
                equipment: '53\' Dry Van',
                broker: 'Southeast Express',
                urgent: true,
            },
            
            
            {
                id: 'L011',
                pickup: 'Chicago, IL',
                delivery: 'Dallas, TX',
                pay: 2800,
                distance: '925 miles',
                pickupTime: 'Today 1:00 PM',
                loadType: 'Dry Van',
                equipment: '53\' Dry Van',
                broker: 'ABC Logistics',
                urgent: true,
            },
            {
                id: 'L012',
                pickup: 'Miami, FL',
                delivery: 'Atlanta, GA',
                pay: 1900,
                distance: '665 miles',
                pickupTime: 'Tomorrow 2:00 PM',
                loadType: 'Reefer',
                equipment: '53\' Reefer',
                broker: 'South Florida Freight',
                urgent: false,
            },
            {
                id: 'L013',
                pickup: 'Los Angeles, CA',
                delivery: 'Phoenix, AZ',
                pay: 1800,
                distance: '372 miles',
                pickupTime: 'Today 6:00 PM',
                loadType: 'Flatbed',
                equipment: '48\' Flatbed',
                broker: 'West Coast Freight',
                urgent: true,
            },
            {
                id: 'L014',
                pickup: 'Seattle, WA',
                delivery: 'Portland, OR',
                pay: 1200,
                distance: '173 miles',
                pickupTime: 'Tomorrow 10:00 AM',
                loadType: 'Dry Van',
                equipment: '53\' Dry Van',
                broker: 'Pacific Hauling',
                urgent: false,
            },
            {
                id: 'L015',
                pickup: 'Houston, TX',
                delivery: 'New Orleans, LA',
                pay: 1600,
                distance: '350 miles',
                pickupTime: 'Today 4:30 PM',
                loadType: 'Reefer',
                equipment: '53\' Reefer',
                broker: 'Bayou Freight',
                urgent: true,
            },
            {
                id: 'L016',
                pickup: 'Denver, CO',
                delivery: 'Salt Lake City, UT',
                pay: 1400,
                distance: '520 miles',
                pickupTime: 'Tomorrow 7:00 AM',
                loadType: 'Flatbed',
                equipment: '48\' Flatbed',
                broker: 'Rocky Mountain Freight',
                urgent: true,
            },
            {
                id: 'L017',
                pickup: 'Philadelphia, PA',
                delivery: 'Boston, MA',
                pay: 1700,
                distance: '310 miles',
                pickupTime: 'Today 3:00 PM',
                loadType: 'Reefer',
                equipment: '53\' Reefer',
                broker: 'Northeast Freight',
                urgent: true,
            },
            {
                id: 'L018',
                pickup: 'San Diego, CA',
                delivery: 'Las Vegas, NV',
                pay: 1500,
                distance: '330 miles',
                pickupTime: 'Tomorrow 9:00 AM',
                loadType: 'Flatbed',
                equipment: '48\' Flatbed',
                broker: 'Desert Transport',
                urgent: false,
            },
            {
                id: 'L019',
                pickup: 'Kansas City, MO',
                delivery: 'St. Louis, MO',
                pay: 950,
                distance: '248 miles',
                pickupTime: 'Tomorrow 11:00 AM',
                loadType: 'Dry Van',
                equipment: '53\' Dry Van',
                broker: 'Heartland Logistics',
                urgent: false,
            },
            {
                id: 'L020',
                pickup: 'El Paso, TX',
                delivery: 'Tucson, AZ',
                pay: 1200,
                distance: '317 miles',
                pickupTime: 'Today 5:00 PM',
                loadType: 'Flatbed',
                equipment: '48\' Flatbed',
                broker: 'Southwest Freight',
                urgent: true,
            },
        ];
        
        res.json({ success: true, loads });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch loads' });
    }
});

/// AI FUNCTIONS ///

// Configure multer for audio uploads
// CREATE UPLOADS DIRECTORY - ADD THIS SECTION
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, `voice-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp3|wav|m4a|webm|ogg|aac/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    },
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit (Whisper limit)
});

// AI Endpoints

// POST /api/voice-to-chat - Main voice to chat endpoint
app.post('/api/voice-to-chat', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No audio file provided' 
            });
        }

        const conversationHistory = req.body.history ? JSON.parse(req.body.history) : [];
        const currentLoads = req.body.currentLoads ? JSON.parse(req.body.currentLoads) : [];
        
        console.log('Voice-to-chat endpoint received:', { 
            historyLength: conversationHistory?.length, 
            loadsCount: currentLoads?.length 
        });
        
        const result = await handleVoiceToChat(req.file.path, conversationHistory, currentLoads);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json(result);
    } catch (error) {
        console.error('Voice to chat error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process voice message' 
        });
    }
});


// Enhanced chat endpoint with load context
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, currentLoads } = req.body;

        // Directly handle 'accept load L001' style messages
        const acceptLoadDirectRegex = /accept (?:the )?load ([a-zA-Z0-9]+)/i;
        const acceptMatch = message && message.match(acceptLoadDirectRegex);
        if (acceptMatch && acceptMatch[1]) {
            const loadId = acceptMatch[1];
            const load = (currentLoads || []).find(l => l.id === loadId);
            if (load) {
                return res.json({
                    success: true,
                    userMessage: message,
                    aiResponse: `✅ Load ${loadId} accepted successfully!\n\n📍 ${load.pickup} → ${load.delivery}\n💰 $${load.pay.toLocaleString()}\n📏 ${load.distance}\n⏰ ${load.pickupTime}`,
                    action: {
                        type: 'accept_load',
                        loadId: loadId
                    },
                    timestamp: new Date().toISOString()
                });
            } else {
                return res.json({
                    success: true,
                    userMessage: message,
                    aiResponse: `Sorry, I couldn't find load ${loadId}.`,
                    action: null,
                    timestamp: new Date().toISOString()
                });
            }
        }

        console.log(message)
        
        console.log('Chat endpoint received:', { 
            messageLength: message?.length, 
            historyLength: history?.length, 
            loadsCount: currentLoads?.length 
        });
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message is required' 
            });
        }

        const aiResponse = await generateChatResponse(message, history || [], currentLoads || []);
        
        res.json({
            success: true,
            userMessage: message,
            aiResponse: aiResponse.text,
            action: aiResponse.action,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate response' 
        });
    }
});


// POST /api/chat-stream - Streaming chat endpoint
app.post('/api/chat-stream', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        const stream = await streamChatResponse(message, history || []);
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(content);
            }
        }
        
        res.end();
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Failed to stream response' });
    }
});


// POST /api/transcribe - Audio transcription only
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No audio file provided' 
            });
        }

        const transcription = await transcribeVoice(req.file.path);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            transcription: transcription,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to transcribe audio' 
        });
    }
});





































/// LOGIN + REGISTER FUNCTIONS ///

// REGISTER ENDPOINT VIA supabase
app.post('/api/signup', async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('Signup error:', error.message);
    return res.status(400).json({ error: error.message });
  }

  const user = data.user;
  if (user) {
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
      });

    if (insertError) {
      console.error('Error inserting user info:', insertError.message);
      return res.status(400).json({ error: insertError.message });
    }

    return res.status(200).json({ message: 'Signup successful', user });
  }
});

// LOGIN ENDPOINT VIA supabase
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('Login error:', error.message);
    return res.status(401).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Login successful', user: data.user });
});


const PORT = process.env.PORT || 2300;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

