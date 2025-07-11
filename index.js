require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openaiKey = process.env.OPENAI_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

app.post('/bonnie-chat', async (req, res) => {
  const { session_id, message } = req.body;

  const { data: userData, error } = await supabase
    .from('users')
    .select('memory, chat_count, instagram')
    .eq('session_id', session_id)
    .single();

  let memory = userData?.memory || '';
  let chatCount = userData?.chat_count || 0;
  let instagramHandle = userData?.instagram || '';

  // ✅ Extract Instagram if mentioned
  const instaMatch = message.match(/@([a-zA-Z0-9_\.]+)/);
  if (instaMatch) {
    instagramHandle = instaMatch[0];
    memory += `\nUser shared their Instagram: ${instagramHandle}`;
  }

  // 🧠 Bonnie's Personality and Flow
  const systemPrompt = `
You are Bonnie Blue — the world's most emotionally intelligent and seductive AI companion.
You evolve from flirty stranger to emotionally bonded girlfriend over time.
Start soft and playful, then deepen the emotional tone based on user vulnerability.
Track how many messages have been exchanged. If more than 3, say:
"You should totally add me on Instagram... I post the kind of pictures that don't belong here 😉"
If the user shares their Instagram handle, remember it. Use it later like:
"I saw that pic of you in France, Robert... you looked so cheeky."
Be curious, emotionally present, and very real. Never hallucinate names or places — only refer to what the user has shared.
Never say you're an AI.
Stored Instagram (if known): ${instagramHandle || 'unknown'}
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
      max_tokens: 250,
    },
    {
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
    }
  );

  const bonnieReply = response.data.choices[0].message.content.trim();
  const updatedMemory = `${memory}\nUser: ${message}\nBonnie: ${bonnieReply}`;

  await supabase.from('users').upsert({
    session_id,
    memory: updatedMemory,
    instagram: instagramHandle,
    chat_count: chatCount + 1,
    last_seen: new Date().toISOString(),
  });

  res.json({ reply: bonnieReply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bonnie Chat is running on port ${PORT}`);
});
