import axios from "axios";

import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cvText } = req.body || {};

  if (!cvText) {
    return res.status(400).json({ error: "CV vide" });
  }

  try {
    if (!process.env.OPENAI_KEY) {
      throw new Error("OPENAI_KEY manquante dans Vercel");
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Tu es un expert RH qui analyse des CV de manière claire et structurée."
          },
          {
            role: "user",
            content: `
Analyse ce CV :

${cvText}

Réponds STRICTEMENT avec :

Résumé:
Points forts:
Points faibles:
Suggestions:
Score /100:
`
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const result = response.data.choices?.[0]?.message?.content;

    if (!result) {
      return res.status(500).json({
        error: "Réponse OpenAI vide"
      });
    }

    return res.status(200).json({ result });

  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      error: "Erreur OpenAI",
      details: err.response?.data || err.message
    });
  }
}