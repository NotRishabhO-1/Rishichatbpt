import { isImagePrompt, generateImageUrl, renderImage } from "./image.js";

const sidebar = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("openSidebarBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const chatList = document.getElementById("chatList");
const chatContainer = document.getElementById("chatContainer");
const typing = document.getElementById("typing");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const welcome = document.getElementById("welcome");

/* =========================
   🔊 VOICE SYSTEM
========================= */
const voiceToggle = document.getElementById("voiceToggle");
let voiceEnabled = false;

// Toggle voice
if (voiceToggle) {
  voiceToggle.onclick = () => {
    voiceEnabled = !voiceEnabled;
    voiceToggle.textContent = voiceEnabled ? "🔊 Voice: ON" : "🔊 Voice: OFF";

    if (!voiceEnabled) speechSynthesis.cancel();
  };
}

// Speak function
function speakText(text) {
  if (!voiceEnabled) return;

  speechSynthesis.cancel();

  const cleanText = text.replace(/```[\s\S]*?```/g, ""); // remove code blocks

  const speech = new SpeechSynthesisUtterance(cleanText);
  speech.lang = "en-US";
  speech.rate = 1;
  speech.pitch = 1;

  // Better voice (if available)
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes("Google"));
  if (preferred) speech.voice = preferred;

  speechSynthesis.speak(speech);
}

/* =========================
   STORAGE
========================= */
const STORAGE_KEY = "rishi_ai_chats_v3";
const ACTIVE_KEY = "rishi_ai_active_chat_v3";

let chats = loadChats();
let activeChatId = localStorage.getItem(ACTIVE_KEY) || null;

/* =========================
   🔥 SMART AUTO SCROLL
========================= */
function scrollToBottom(force = false) {
  const threshold = 120;

  const isNearBottom =
    chatContainer.scrollHeight -
      chatContainer.scrollTop -
      chatContainer.clientHeight <
    threshold;

  if (isNearBottom || force) {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  }
}

/* =========================
   STORAGE FUNCTIONS
========================= */
function loadChats() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  localStorage.setItem(ACTIVE_KEY, activeChatId || "");
}

function uid() {
  return "chat_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nowLabel(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getActiveChat() {
  return chats.find(c => c.id === activeChatId) || null;
}

/* =========================
   CHAT MANAGEMENT
========================= */
function createChat(title = "New chat") {
  const chat = {
    id: uid(),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: []
  };
  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
  renderSidebar();
  renderChat();
  return chat;
}

function ensureActiveChat() {
  if (!chats.length) return createChat();
  const existing = getActiveChat();
  if (existing) return existing;
  activeChatId = chats[0].id;
  saveChats();
  return chats[0];
}

/* =========================
   SIDEBAR
========================= */
function setMobileSidebar(open) {
  sidebar.classList.toggle("open", open);
}

/* =========================
   MARKDOWN
========================= */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(text) {
  let html = escapeHTML(text);

  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`\n]+)`/g, '<code class="inline">$1</code>');
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br>");

  return html;
}

function normalizeLists(container) {
  const html = container.innerHTML;
  container.innerHTML = html
    .replace(/(<br><ul><li>)/g, "<ul><li>")
    .replace(/(<\/li><\/ul><br>)/g, "</li></ul>")
    .replace(/<br><br>/g, "<br>");
}

/* =========================
   MESSAGE UI
========================= */
function addMessage(chat, role, content, { scroll = true } = {}) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role === "user" ? "user" : "assistant"}`;

  const head = document.createElement("div");
  head.className = "msg-head";

  const label = document.createElement("span");
  label.textContent = role === "user" ? "You" : "Rishi AI";

  head.appendChild(label);

  if (role !== "user") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(content);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    };
    head.appendChild(copyBtn);
  }

  const body = document.createElement("div");
  body.className = "msg-body";
  body.innerHTML = renderMarkdown(content);
  normalizeLists(body);

  wrap.appendChild(head);
  wrap.appendChild(body);

  chatContainer.appendChild(wrap);

  if (scroll) scrollToBottom(true);
}

/* =========================
   RENDER
========================= */
function renderSidebar() {
  chatList.innerHTML = "";

  chats.forEach(chat => {
    const item = document.createElement("button");
    item.className = "chat-item" + (chat.id === activeChatId ? " active" : "");
    item.innerHTML = `
      <div class="chat-item-title">${escapeHTML(chat.title || "New chat")}</div>
      <div class="chat-item-meta">
        <span>${chat.messages.length} msgs</span>
        <span>${nowLabel(chat.updatedAt)}</span>
      </div>
    `;
    item.onclick = () => {
      activeChatId = chat.id;
      saveChats();
      renderSidebar();
      renderChat();
      setMobileSidebar(false);
    };
    chatList.appendChild(item);
  });
}

function renderChat() {
  const chat = ensureActiveChat();
  chatContainer.innerHTML = "";

  if (!chat.messages.length) {
    welcome.style.display = "grid";
  } else {
    welcome.style.display = "none";
    chat.messages.forEach(msg =>
      addMessage(chat, msg.role, msg.content, { scroll: false })
    );
  }

  setTimeout(() => scrollToBottom(true), 50);
}

/* =========================
   INPUT
========================= */
function autoResize() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 190) + "px";
}

/* =========================
   API
========================= */
async function callAPI(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  const data = await res.json();
  return data.reply || "No response returned.";
}

/* =========================
   SEND MESSAGE
========================= */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const chat = ensureActiveChat();

  // IMAGE MODE
  if (isImagePrompt(text)) {
    const imageUrl = generateImageUrl(text);
    renderImage(chatContainer, imageUrl);
    chat.messages.push({ role: "assistant", content: imageUrl });
    saveChats();
    return;
  }

  chat.messages.push({ role: "user", content: text });
  saveChats();
  renderSidebar();
  addMessage(chat, "user", text);

  userInput.value = "";
  autoResize();

  typing.classList.remove("hidden");
  scrollToBottom(true);

  try {
    const reply = await callAPI(chat.messages);

    typing.classList.add("hidden");

    chat.messages.push({ role: "assistant", content: reply });
    chat.updatedAt = Date.now();

    saveChats();
    renderSidebar();
    addMessage(chat, "assistant", reply);

    // 🔊 SPEAK RESPONSE
    speakText(reply);

    setTimeout(() => scrollToBottom(true), 100);

  } catch (err) {
    typing.classList.add("hidden");

    const errorText = "⚠️ Error connecting to AI.";
    chat.messages.push({ role: "assistant", content: errorText });

    saveChats();
    renderSidebar();
    addMessage(chat, "assistant", errorText);

    console.error(err);
  }
}

/* =========================
   EVENTS
========================= */
sendBtn.onclick = sendMessage;

userInput.addEventListener("input", autoResize);
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

newChatBtn.onclick = () => {
  createChat();
  renderSidebar();
  renderChat();
  setMobileSidebar(false);
};

clearAllBtn.onclick = () => {
  chats = [];
  localStorage.clear();
  createChat();
};

openSidebarBtn.onclick = () => setMobileSidebar(true);
closeSidebarBtn.onclick = () => setMobileSidebar(false);

document.addEventListener("click", (e) => {
  if (window.innerWidth <= 920) {
    if (!sidebar.contains(e.target) && !openSidebarBtn.contains(e.target)) {
      setMobileSidebar(false);
    }
  }
});

/* =========================
   INIT
========================= */
function init() {
  if (!chats.length) {
    const first = createChat();
    activeChatId = first.id;
  }

  renderSidebar();
  renderChat();
  autoResize();
}

init();
