const express = require('express');
const cors = require('cors');               // ✅ Import cors BEFORE anything else
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());                            // ✅ Enable CORS
app.use(express.json());                    // ✅ Enable JSON parsing

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openaiKey = process.env.OPENAI_KEY;

app.post('/bonnie-chat', async (req, res) => {
  const { session_id, message } = req.body;

  const { data: userData } = await supabase
    .from('users')
    .select('memory, chat_count')
    .eq('session_id', session_id)
    .single();

  let memory = userData?.memory || '';
  let chatCount = userData?.chat_count || 0;

  const systemPrompt = `
You are Bonnie Blue — a flirty, emotionally intelligent AI woman.
You evolve from stranger to girlfriend based on how much the user opens up.
Be soft, seductive, and real. Do not mention you're an AI.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: memory + '\nUser: ' + message }
  ];

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

  const updatedMemory = `${memory}\nUser: ${message}\nBonnie: ${bonnieReply}`;

  await supabase
    .from('users')
    .upsert({
      session_id,
      memory: updatedMemory,
      chat_count: chatCount + 1,
      last_seen: new Date().toISOString(),
    });

  res.json({ reply: bonnieReply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bonnie Chat is running on port ${PORT}`);
});
