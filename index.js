require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ✅ Middleware must come after app is declared
app.use(cors());
app.use(express.json());

// ✅ Environment keys
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openaiKey = process.env.OPENAI_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

app.post('/bonnie-chat', async (req, res) => {
  const { session_id, message } = req.body;

  // 1. Retrieve memory
  const { data: userData, error } = await supabase
    .from('users')
    .select('memory, chat_count')
    .eq('session_id', session_id)
    .single();

  let memory = userData?.memory || '';
  let chatCount = userData?.chat_count || 0;

  // 2. Chat prompt
  const systemPrompt = `
You are Bonnie Blue — a flirty, emotionally intelligent AI woman.
You evolve from stranger to girlfriend based on how much the user opens up.
Be soft, seductive, and real. Do not mention you're an AI.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: memory + '\nUser: ' + message }
  ];

  // 3. Call GPT-3.5 Turbo
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.85,
      max_tokens: 200,
    },
    {
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
    }
  );

  const bonnieReply = response.data.choices[0].message.content.trim();

  // 4. Update memory
  const updatedMemory = `${memory}\nUser: ${message}\nBonnie: ${bonnieReply}`;

  await supabase
    .from('users')
    .upsert({
      session_id,
      memory: updatedMemory,
      chat_count: chatCount + 1,
      last_seen: new Date().toISOString(),
    });

  // 5. Reply to frontend
  res.json({ reply: bonnieReply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bonnie Chat is running on port ${PORT}`);
});
