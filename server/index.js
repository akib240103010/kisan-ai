import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './db.js';
import multer from 'multer';

// Load environment variables
dotenv.config();
console.log("My API Key is:",process.env.GEMINI_API_KEY);
const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.FRONTEND_URL === '*') {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({limit:'50mb'}));

// Initialize multer memory storage middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini using your free key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', upload.single('image'), async (req, res) => {
  try {
    const { message, lang, history, sessionId } = req.body;
    
    // Parse the history array passed via FormData
    let parsedHistory = [];
    if (history) {
      try {
        parsedHistory = JSON.parse(history);
      } catch (err) {
        console.error("Failed to parse history JSON:", err);
      }
    }

    // Check if an image file was attached
    const file = req.file;
    let imageBase64 = null;
    let mimeType = null;
    if (file) {
      imageBase64 = file.buffer.toString('base64');
      mimeType = file.mimetype;
    }
    
    let sessionTitle = null;

    // Save user message to database if sessionId is present
    if (sessionId) {
      try {
        // Check if this is the first message in the session
        const countRes = await pool.query(
          "SELECT COUNT(*) FROM chat_messages WHERE session_id = $1",
          [sessionId]
        );
        const isFirstMessage = parseInt(countRes.rows[0].count) === 0;

        const loggedText = imageBase64 ? `[📷 Photo] ${message}`.trim() : message;
        await pool.query(
          "INSERT INTO chat_messages (session_id, sender, text) VALUES ($1, 'user', $2)",
          [sessionId, loggedText]
        );

        if (isFirstMessage) {
          try {
            const titleModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const titlePrompt = `Generate a short, 3-to-5 word title summary of the following user agricultural query. It must be in ${lang === 'hi' ? 'Hindi' : 'English'}. Do not include markdown, double quotes, or any extra text. Output ONLY the raw title.
            Query: "${message}"`;
            
            const titleResult = await titleModel.generateContent(titlePrompt);
            const rawTitle = titleResult.response.text().trim().replace(/^["']|["']$/g, '');
            if (rawTitle) {
              sessionTitle = rawTitle;
              await pool.query(
                "UPDATE chat_sessions SET title = $1 WHERE id = $2",
                [sessionTitle, sessionId]
              );
            }
          } catch (titleErr) {
            console.error("Failed to generate session title:", titleErr);
          }
        }
      } catch (dbErr) {
        console.error("Failed to log user message:", dbErr);
      }
    }
    
    // Using the free, fast flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    
    // 2. Format the history into a readable text log
    const chatLog = parsedHistory ? parsedHistory.map(m => 
      `${m.role === 'user' ? 'Farmer' : 'Kisan AI'}: ${m.text}`
    ).join('\n') : "";

    // 3. Routing check based on user message keywords
    const schemeKeywords = [
      'pm-kisan', 'pmkisan', 'mnssby', '7 nishchay', '7nishchay', 
      'credit card', 'kcc', 'portal error', 'dpo', 'scheme', 'loan', 
      'subsidy', 'subsidies', 'dbt', 'portal', 'government', 'bima', 
      'insurance', 'yojana', 'registration error', 'aadhaar', 'seeding', 'land record'
    ];
    
    const isSchemeQuery = schemeKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    let prompt = "";
    if (isSchemeQuery) {
      prompt = `
        You are Kisan AI's specialized Government Scheme Routing Agent and Bureaucratic Troubleshooter for Indian farmers.
        Your goal is to act as a helpful bureaucratic troubleshooter who decodes complex, frustrating state portal errors, guidelines, and application processes for agricultural schemes.

        Help the farmer troubleshoot issues such as:
        1. PM-Kisan (Pradhan Mantri Kisan Samman Nidhi) issues (e.g., Aadhaar seeding errors, land record mismatches, inactive status, installment tracking).
        2. Kisan Credit Card (KCC) loans (e.g., application criteria, subsidized interest rates, document requirements).
        3. State DBT (Direct Benefit Transfer) portals (e.g., Bihar Agriculture Department, UP Agriculture, MP Kisan, registering for seed/tractor subsidies).
        4. Portal Errors (e.g., OTP validation failure, server downtime, document upload limits, registration rejection reasons, DPO/district approvals).
        5. Crop Insurance (PMFBY) (e.g., claims registration, deadline checks, loss assessment).
        6. General questions about national or state-level schemes, eligibility, or application steps.

        Past Conversation:
        ${chatLog}

        The user is now asking: "${message}". 
        The preferred language is: ${lang}. 

        CRITICAL INSTRUCTION: You MUST return your response as a valid, raw JSON object. Do not include markdown formatting, backticks, or introductory text. Use this exact structure:
        {
          "disease_name": "Government Scheme Help / सरकारी योजना सहायता",
          "confidence_score": "N/A",
          "immediate_action": "Your clear, step-by-step bureaucratic troubleshooting advice, explanation, or direct answer here. Address the user directly in simple language. If they asked in Hindi, write this in Hindi. Otherwise, English.",
          "chemical_cure": "N/A",
          "organic_cure": "N/A",
          "dosage_per_acre": "N/A"
        }
      `;
    } else {
      prompt = `
        You are Kisan AI, a highly knowledgeable farming assistant for farmers in India.
        
        CRITICAL KNOWLEDGE BASE (Use this to answer questions about schemes):
        - PM-Kisan (Pradhan Mantri Kisan Samman Nidhi): Eligible landholding farmer families receive Rs. 6,000 per year in three equal installments of Rs. 2,000 every four months.
        - Kisan Credit Card (KCC): Provides short-term credit limits/loans to farmers for agriculture, seeds, and fertilizers at heavily subsidized interest rates.
        - State-Level Portals: Always remind farmers to check their local state DBT (Direct Benefit Transfer) Agriculture portals (for example, the Bihar Agriculture Department portal) for specific local subsidies on tractors and seeds.
        - Crop Insurance (PMFBY): Pradhan Mantri Fasal Bima Yojana provides insurance cover against crop failure due to natural calamities, pests, and diseases.

        Past Conversation:
        ${chatLog}
        
        The user is now asking: "${message}". 
        The preferred language is: ${lang}. 
      `;

      if (imageBase64) {
        prompt += `
          The user has also attached a photo of their crop/plant.
          CRITICAL INSTRUCTION FOR IMAGES: Analyze the attached photo, identify the crop/plant, diagnose any visible diseases, pests, or nutrient deficiencies, and provide actionable advice.
        `;
      }

      prompt += `
        Provide helpful, accurate farming advice based on the knowledge base and past conversation.
        
        CRITICAL INSTRUCTION: You MUST return your response as a valid, raw JSON object. Do not include markdown formatting, backticks, or introductory text. Use this exact structure:
        {
          "disease_name": "Name of the disease (or 'General Advice' if the user is not asking about a disease/image diagnosis)",
          "confidence_score": "Percentage (e.g., 95%) or N/A",
          "immediate_action": "One quick sentence on what to do right now, or the direct answer to their question.",
          "chemical_cure": "Specific chemical names/products available in India, or 'N/A'. If a chemical cure is recommended, you MUST include an estimated local market price range in Indian Rupees (INR) for that specific product on a new line formatted exactly as: '\\n💰 Estimated Cost: ₹[price range] per [unit]' (e.g., '\\n💰 Estimated Cost: ₹400 - ₹600 per Liter/Kg').",
          "organic_cure": "Home remedies using local ingredients, or 'N/A'. If an organic cure is recommended, you MUST include an estimated local market price range in Indian Rupees (INR) for that specific product on a new line formatted exactly as: '\\n💰 Estimated Cost: ₹[price range] per [unit]' (e.g., '\\n💰 Estimated Cost: ₹200 - ₹350 per 500ml').",
          "dosage_per_acre": "Standard mixture ratio for a 1-acre field, or 'N/A'."
        }
      `;
    }

    // Construct multi-modal parts array
    const contentParts = [prompt];
    if (imageBase64 && mimeType) {
      contentParts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      });
    }

    const result = await model.generateContent(contentParts);
    const responseText = result.response.text();

    // --- NEW JSON PARSING LOGIC ---
    let cleanData;
    try {
      // 1. Clean accidental markdown backticks from Gemini
      let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // 2. Convert text to JSON
      cleanData = JSON.parse(cleanedText);
      
      // Save bot response to database if sessionId is present
      if (sessionId && cleanData) {
        try {
          const botReplyText = cleanData.immediate_action || "";
          await pool.query(
            `INSERT INTO chat_messages (
              session_id, sender, text, disease_name, confidence_score,
              immediate_action, chemical_cure, organic_cure, dosage_per_acre
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              sessionId,
              'bot',
              botReplyText,
              cleanData.disease_name || 'General Advice',
              cleanData.confidence_score || 'N/A',
              cleanData.immediate_action || '',
              cleanData.chemical_cure || 'N/A',
              cleanData.organic_cure || 'N/A',
              cleanData.dosage_per_acre || 'N/A'
            ]
          );
        } catch (dbErr) {
          console.error("Failed to log bot response:", dbErr);
        }
      }
      
      // 3. Send structured data to React
      res.json({ success: true, data: cleanData, newTitle: sessionTitle });
    } catch (parseError) {
      console.error("AI didn't return JSON:", parseError);
      res.status(500).json({ success: false, message: "Failed to parse AI response." });
    }
    
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Request failed" });
  }
});
app.post('/api/diagnose', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert agricultural AI. 
      Look at this photo of a crop or plant. 
      Identify what plant it is, diagnose any visible diseases, pests, or nutrient deficiencies, and provide actionable advice for the farmer to treat it.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      }
    ]);

    const responseText = result.response.text();
    res.json({ reply: responseText });

  } catch (error) {
    console.error("Vision API Error:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

// --- DATABASE API ROUTES ---

// User Login / OTP Upsert
app.post('/api/users/login', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { phone_number } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Upsert User
    const userRes = await client.query(
      `INSERT INTO users (phone_number) VALUES ($1)
       ON CONFLICT (phone_number) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id, phone_number`,
      [phone_number]
    );
    const user = userRes.rows[0];

    // Upsert Farm Profile
    await client.query(
      `INSERT INTO farm_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    // Fetch Profile
    const profileRes = await client.query(
      `SELECT * FROM farm_profiles WHERE user_id = $1`,
      [user.id]
    );
    const profile = profileRes.rows[0];

    // Get or Create default session
    let sessionRes = await client.query(
      `SELECT id FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    
    let sessionId;
    if (sessionRes.rows.length > 0) {
      sessionId = sessionRes.rows[0].id;
    } else {
      const newSessionRes = await client.query(
        `INSERT INTO chat_sessions (user_id, title) VALUES ($1, 'General Chat') RETURNING id`,
        [user.id]
      );
      sessionId = newSessionRes.rows[0].id;
    }

    await client.query('COMMIT');
    res.json({ user, profile, defaultSessionId: sessionId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Login Error:", error);
    res.status(500).json({ error: "Failed to authenticate" });
  } finally {
    client.release();
  }
});

// Get User Profile
app.get('/api/profiles/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM farm_profiles WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Fetch Profile Error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update User Profile
app.put('/api/profiles/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { state, district, default_land_size, default_measurement_unit } = req.body;
    const result = await pool.query(
      `INSERT INTO farm_profiles (user_id, state, district, default_land_size, default_measurement_unit)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         state = EXCLUDED.state,
         district = EXCLUDED.district,
         default_land_size = EXCLUDED.default_land_size,
         default_measurement_unit = EXCLUDED.default_measurement_unit,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, state, district, default_land_size, default_measurement_unit]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Fetch Chat Sessions
app.get('/api/chats/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Sessions Error:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

// Create Chat Session
app.post('/api/chats/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title } = req.body;
    const result = await pool.query(
      'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *',
      [userId, title || 'New Chat']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Create Session Error:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

// Fetch Chat Session Messages
app.get('/api/chats/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Messages Error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Kisan AI server running on http://localhost:${PORT}`);
});
