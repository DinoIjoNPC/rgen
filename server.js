const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROK_API_KEY = process.env.GROK_API_KEY;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate-image', async (req, res) => {
  try {
    if (!GROK_API_KEY) {
      return res.status(500).json({ error: 'GROK_API_KEY belum diatur di server.' });
    }

    const { prompt, width, height } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
    }

    // Model image generation xAI saat ini bernama "grok-imagine-image-quality"
    // (sebelumnya "grok-2-image", yang sudah tidak berlaku lagi per rilis Grok Imagine API).
    // Endpoint mendukung parameter aspect_ratio, jadi kita turunkan dari width/height
    // yang dikirim frontend (1:1 untuk Icon/Logo, 16:9 untuk Thumbnail).
    let aspectRatio = '1:1';
    if (width && height) {
      const ratio = width / height;
      aspectRatio = Math.abs(ratio - 16 / 9) < 0.05 ? '16:9' : '1:1';
    }

    const requestBody = {
      model: 'grok-imagine-image-quality',
      prompt: prompt.trim(),
      aspect_ratio: aspectRatio,
      n: 1
    };

    const grokResponse = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!grokResponse.ok) {
      const errText = await grokResponse.text();
      console.error('Grok API error:', grokResponse.status, errText);

      let errMessage = `Grok API mengembalikan error (status ${grokResponse.status}).`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error) {
          errMessage += ` Detail: ${errJson.error}`;
        }
      } catch (parseErr) {
        // errText bukan JSON valid, gunakan pesan default saja
      }

      return res.status(grokResponse.status).json({ error: errMessage });
    }

    const data = await grokResponse.json();
    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      return res.status(502).json({ error: 'Respons Grok tidak berisi URL gambar.' });
    }

    return res.json({ imageUrl });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
