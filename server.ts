import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json());

// Server-side Gemini API route for game over review / music critic
app.post('/api/commentary', async (req, res) => {
  const { score } = req.body || {};
  const numericScore = typeof score === 'number' ? score : Number(score) || 0;

  try {

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ 
        commentary: numericScore >= 30 
          ? "Virtuoso! Pure rhythmic mastery on the synth keys." 
          : numericScore >= 15 
          ? "Nice groove, DJ! You're really catching the beat." 
          : "Keep practicing those scales, Maestro!" 
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `I just finished playing 'Freq Snake', a musical synth snake game. I scored ${numericScore} points. 
The grid size is small. A score of 0-5 is 'tone deaf'. 10-20 is 'catching the beat'. 30+ is 'virtuoso'.
Give me a very short, witty, music-themed sarcastic or encouraging one-sentence remark about my performance. 
Address me as 'DJ' or 'Maestro'. Keep it under 20 words.`,
      config: {
        systemInstruction: "You are a retro 8-bit synthesizer critic reviewing a player's performance in an arcade synth snake game. Keep responses to a single punchy sentence.",
      },
    });

    return res.json({ commentary: response.text || "Music Stopped!" });
  } catch (error: any) {
    console.error('Gemini server error:', error);
    const fallback = numericScore >= 30 
      ? "Virtuoso! Pure rhythmic mastery on the synth keys, Maestro." 
      : numericScore >= 15 
      ? "Solid groove, DJ! You're really catching the beat." 
      : "Track ended! Keep spinning the vinyl and practicing scales, DJ.";
    return res.json({ commentary: fallback });
  }
});

// Server-side streaming endpoint supporting Server-Sent Events (SSE)
app.post('/api/gemini/stream', async (req, res) => {
  try {
    const { prompt } = req.body;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!process.env.GEMINI_API_KEY) {
      res.write(`data: ${JSON.stringify({ text: "API key not configured on server." })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: prompt || 'Generate a short synthwave theme description.',
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});

// Mount Vite middleware in development or serve static build in production
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { 
      middlewareMode: true,
      hmr: false,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
});
