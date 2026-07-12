const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
    const { prompt, width, height } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
    }

    // Pollinations.ai: layanan gratis, tanpa API key, tanpa langganan.
    // Endpoint: GET https://image.pollinations.ai/prompt/{prompt}
    const finalWidth = width || 512;
    const finalHeight = height || 512;
    const seed = Math.floor(Math.random() * 1000000);

    const encodedPrompt = encodeURIComponent(prompt.trim());
    const imageUrl =
      `https://image.pollinations.ai/prompt/${encodedPrompt}` +
      `?width=${finalWidth}&height=${finalHeight}&seed=${seed}&nologo=true&model=flux`;

    // Pollinations men-generate gambar secara lazy saat URL diakses,
    // jadi kita cek dulu apakah gambar benar-benar berhasil dibuat
    // sebelum mengirim URL ke frontend.
    const checkResponse = await fetch(imageUrl);

    if (!checkResponse.ok) {
      console.error('Pollinations error:', checkResponse.status);
      return res.status(502).json({
        error: `Layanan gambar mengembalikan error (status ${checkResponse.status}).`
      });
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
