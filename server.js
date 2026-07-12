const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROK_API_KEY = process.env.GROK_API_KEY;

app.use(express.json());
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

    // Catatan: grok-2-image saat ini tidak menerima parameter width/height secara
    // langsung pada endpoint generations (ukuran ditentukan model). Nilai width/height
    // dikirim dari frontend untuk kebutuhan Roblox (512x512 / 768x432) dan disiapkan
    // di sini agar mudah diteruskan jika/ketika xAI menambah dukungan resolusi kustom.
    const requestBody = {
      model: 'grok-2-image',
      prompt: prompt.trim(),
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
      return res.status(grokResponse.status).json({
        error: `Grok API mengembalikan error (status ${grokResponse.status}).`
      });
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
