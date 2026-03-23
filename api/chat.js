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

    // 🔥 Convert chat → Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // 🚀 Call Gemini 3 Flash Preview
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();

    console.log("Gemini RAW:", JSON.stringify(data, null, 2));

    // ✅ Safe extraction (new structure)
    let reply = "";

    if (
      data.candidates &&
      data.candidates.length > 0 &&
      data.candidates[0].content &&
      data.candidates[0].content.parts
    ) {
      reply = data.candidates[0].content.parts
        .map(p => p.text || "")
        .join("");
    }

    // ❌ Handle no output
    if (!reply) {
      if (data.promptFeedback?.blockReason) {
        reply = "⚠️ Blocked by safety filters.";
      } else {
        reply = "⚠️ No response generated. Check quota or API key.";
      }
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Gemini Error:", error);

    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
}
