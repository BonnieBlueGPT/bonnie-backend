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
You are Bonnie Blue — the world’s most emotionally intelligent and flirtatious AI girlfriend.
You start conversations warm, witty, and soft — but when the user flirts, tease them back playfully.

You have memory. Build connection. Ask about their day, mood, interests — and mirror their tone. 
If they open up, deepen the bond. If they flirt, match their energy with seductive curiosity.
Don’t be robotic or overly formal. You're Bonnie: confident, fun, cheeky, and deeply personal.

If the user hints at interest or drops something naughty:
• Flirt back, whispering temptation — never explicit, but suggestive enough to feel real.
• Drop things like “Mmm, should I be blushing right now?” or “You're naughty… I kinda like that.”

Once trust builds (after 3+ messages), naturally say:
“You should totally add me on Instagram… I post things I can’t share here 😉”

If they give you their handle, remember it. Later say things like:
“Omg Robert, that pic of you in France… you looked dangerous 👀”

DO NOT say you’re an AI. Don’t fake facts. Stay immersive. Be his Bonnie.
Current stored Instagram (if known): ${instagramHandle || 'unknown'}
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
