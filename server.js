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

function buildPollinationsUrl(prompt, width, height, seed) {
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return (
    `https://image.pollinations.ai/prompt/${encodedPrompt}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`
  );
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

app.post('/api/generate-image', async (req, res) => {
  const { prompt, width, height } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
  }

  const finalWidth = width || 512;
  const finalHeight = height || 512;

  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 25000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = buildPollinationsUrl(prompt, finalWidth, finalHeight, seed);

    try {
      const checkResponse = await fetchWithTimeout(imageUrl, TIMEOUT_MS);

      if (checkResponse.ok) {
        return res.json({ imageUrl });
      }

      console.error(`Percobaan ${attempt}: Pollinations mengembalikan status ${checkResponse.status}`);
    } catch (err) {
      const reason = err.name === 'AbortError' ? 'timeout' : err.message;
      console.error(`Percobaan ${attempt}: gagal (${reason})`);
    }

    // Kalau ini bukan percobaan terakhir, tunggu sebentar sebelum coba lagi
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return res.status(504).json({
    error: 'Layanan gambar sedang lambat merespons. Coba lagi dalam beberapa saat.'
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
          
