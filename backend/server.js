const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: permite tu frontend en Vercel
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(express.json());

// Health check
app.get("/", (_req, res) => res.json({ status: "ok" }));

// Proxy a Gemini
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key no configurada en servidor" });
  }

  // Personalidad según idioma destino
  const personas = {
    "fr-CA": {
      role: "Native French Canadian Speaker from Quebec",
      context: "Use vocabulary, idioms, and informal expressions typical of Quebec.",
    },
    en: {
      role: "Native North American English Speaker",
      context: "Use natural, idiomatic American/Canadian English.",
    },
    es: {
      role: "Hablante Nativo de Español Latinoamericano",
      context: "Usa un tono natural y coloquial.",
    },
    "fr-FR": {
      role: "Native European French Speaker",
      context: "Use standard Metropolitan French.",
    },
  };

  const langNames = {
    es: "Spanish",
    en: "English",
    "fr-CA": "Canadian French",
    "fr-FR": "European French",
  };

  const persona = personas[targetLang] || { role: "Professional Translator", context: "" };

  const prompt = `
    Role: ${persona.role}
    Task: Translate ${langNames[sourceLang] || sourceLang} to ${langNames[targetLang] || targetLang}.
    Context: ${persona.context}
    Rules: Output ONLY the translated text. No quotes.
    Text: "${text}"
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `Error ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translation) {
      return res.status(500).json({ error: "No se recibió traducción" });
    }

    res.json({ translation });
  } catch (err) {
    console.error("Gemini error:", err.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend proxy en puerto ${PORT}`);
});
