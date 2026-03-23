// image.js

export function isImagePrompt(text) {
  const t = text.toLowerCase();
  return (
    t.includes("image") ||
    t.includes("generate") ||
    t.includes("draw") ||
    t.includes("create picture")
  );
}

export function generateImageUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
}

export function renderImage(chatContainer, imageUrl) {
  const wrap = document.createElement("div");
  wrap.className = "message assistant";

  const img = document.createElement("img");
  img.src = imageUrl;
  img.style.maxWidth = "100%";
  img.style.borderRadius = "16px";

  wrap.appendChild(img);
  chatContainer.appendChild(wrap);

  chatContainer.scrollTop = chatContainer.scrollHeight;
}
