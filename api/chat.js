export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // 🔥 Convert chat history into Gemini format
    const conversation = messages
      .map(msg => {
        if (msg.role === "user") return `User: ${msg.content}`;
        if (msg.role === "assistant") return `AI: ${msg.content}`;
        return "";
      })
      .join("\n");

    // 🧠 System prompt (your AI personality)
    const systemPrompt = `
You are Rishi AI, a sleek, elegant, and highly intelligent assistant.
- Be clear, helpful, and slightly premium in tone.
- Use clean formatting (paragraphs, lists, code blocks when needed).
- Keep responses concise unless asked for detail.
`;

    const fullPrompt = systemPrompt + "\n\n" + conversation + "\nAI:";

    // 🚀 Gemini API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();

    // 🧾 Extract response safely
    let reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    // ❌ Handle blocked / empty responses
    if (!reply) {
      if (data?.promptFeedback?.blockReason) {
        reply = "⚠️ Response blocked due to safety filters.";
      } else {
        reply = "⚠️ No response generated. Try again.";
      }
    }

    // ✨ Clean response
    reply = reply.trim();

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Gemini API Error:", error);

    return res.status(500).json({
      error: "Server error",
      details: error.message || "Unknown error"
    });
  }
}
