const express = require('express');
const cors = require('cors');
require('dotenv').config()
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { supabase } = require('./supabaseClient');
const { 
    generateChatResponse, 
    handleVoiceToChat, 
} = require('./ai')
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();

app.use(cors())
app.use(express.json({limit: '5mb'}));

// endpoint to get current loads
app.get('/api/loads', async (req, res) => {
    try {
        const { data: loads, error } = await supabase
            .from('loads')
            .select('*')
            .eq('doc_type', 'load');
        if (error) throw error;
        res.json({ success: true, loads });
    } 
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch loads' });
    }
});

// endpoint to get current bids
app.get('/api/bids', async (req, res) => {
    try {
        const { data: bids, error } = await supabase
            .from('bids')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, bids });
    } 
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch bids' });
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

        const history = req.body.history ? JSON.parse(req.body.history) : [];
        
        // 1. Transcribe the audio file
        const userMessage = await handleVoiceToChat(req.file.path);

        // 2. Embed the transcribed text
        const { data: embedData } = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: userMessage
        });
        const userEmbedding = embedData[0].embedding;

        // 3. Query Supabase for top 5 similar loads
        const { data: relevantLoads, error } = await supabase.rpc('match_loads', {
        query_embedding: userEmbedding,
        match_count: 5
        });
        if (error) {
        console.error('Vector search error:', error);
        }

        // 4. Pass relevantLoads to your LLM prompt
        const aiResponse = await generateChatResponse(userMessage, history, relevantLoads);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            userMessage,
            aiResponse: aiResponse.text,
            action: aiResponse.action,
            timestamp: new Date().toISOString()
        });

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
    console.log("CHAT ENDPOINT")
    try {

        const { message, history } = req.body
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Message is required' 
            });
        }

        const safeMessage = typeof message === "string" ? message : "";

        // 1. Embed the user message
        const { data: embedData } = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: safeMessage
        });
        const userEmbedding = embedData[0].embedding;

        // 2. Query Supabase for top 5 similar loads
        const { data: relevantLoads, error } = await supabase.rpc('match_loads', {
        query_embedding: userEmbedding,
        match_count: 5
        });
        if (error) {
        console.error('Vector search error:', error);
        }

        // 3. Pass relevantLoads to your LLM prompt
        const aiResponse = await generateChatResponse(message, history, relevantLoads);

        // If a bid was placed, save it to Supabase
        let bidResult = null;
        if (aiResponse.action && aiResponse.action.type === "make_bid") {
            // You may want to get userId from req.body or session
            const { loadId, bidAmount, confirmation } = aiResponse.action;
            const userId = req.body.userId || null; // Adjust as needed
            const { data: bidData, error: bidError } = await supabase
                .from('bids')
                .insert([
                    {
                        load_id: loadId,
                        bid_amount: bidAmount,
                        confirmation,
                        user_id: userId,
                        created_at: new Date().toISOString()
                    }
                ]);
            if (bidError) {
                console.error('Error saving bid:', bidError);
                bidResult = { success: false, error: bidError.message };
            } else {
                bidResult = { success: true, bid: bidData };
            }
        }

        // Fetch all bids for this user (or all bids if userId not provided)
        let bids = [];
        if (aiResponse.action && aiResponse.action.type === "make_bid") {
            const { data: allBids, error: allBidsError } = await supabase
                .from('bids')
                .select('*')
                .order('created_at', { ascending: false });
            if (!allBidsError && allBids) {
                bids = allBids;
            }
        }

        res.json({
            success: true,
            userMessage: message,
            aiResponse: aiResponse.text,
            action: aiResponse.action,
            bids,
            bidResult,
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

