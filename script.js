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

const STORAGE_KEY = "rishi_ai_chats_v3";
const ACTIVE_KEY = "rishi_ai_active_chat_v3";

let chats = loadChats();
let activeChatId = localStorage.getItem(ACTIVE_KEY) || null;

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

function setMobileSidebar(open) {
  sidebar.classList.toggle("open", open);
}

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
  html = html.replace(/\n- (.*?)(?=\n|$)/g, "<ul><li>$1</li></ul>");
  html = html.replace(/\n\1\. (.*?)(?=\n|$)/g, "$1"); // harmless no-op if unmatched
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

  if (scroll) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

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
    chat.messages.forEach(msg => addMessage(chat, msg.role, msg.content, { scroll: false }));
  }

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function autoResize() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 190) + "px";
}

async function callAPI(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Request failed");
  }

  const data = await res.json();
  return data.reply || "No response returned.";
}

function getTitleFromText(text) {
  const cleaned = text.trim().replace(/\s+/g, " ");
  return cleaned.length > 34 ? cleaned.slice(0, 34) + "…" : cleaned || "New chat";
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const chat = ensureActiveChat();
  welcome.style.display = "none";

  chat.messages.push({ role: "user", content: text });
  chat.updatedAt = Date.now();

  if (chat.messages.length === 1) {
    chat.title = getTitleFromText(text);
  }

  saveChats();
  renderSidebar();
  addMessage(chat, "user", text);

  userInput.value = "";
  autoResize();

  typing.classList.remove("hidden");

  try {
    const reply = await callAPI(
      chat.messages.map(m => ({ role: m.role, content: m.content }))
    );

    typing.classList.add("hidden");

    chat.messages.push({ role: "assistant", content: reply });
    chat.updatedAt = Date.now();
    saveChats();
    renderSidebar();
    addMessage(chat, "assistant", reply);
  } catch (err) {
    typing.classList.add("hidden");
    const errorText = "Connection failed. Check your Vercel environment variables and API route.";
    chat.messages.push({ role: "assistant", content: errorText });
    chat.updatedAt = Date.now();
    saveChats();
    renderSidebar();
    addMessage(chat, "assistant", errorText);
    console.error(err);
  }
}

function clearAllChats() {
  chats = [];
  activeChatId = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_KEY);
  createChat();
  renderSidebar();
  renderChat();
}

newChatBtn.onclick = () => {
  createChat();
  renderSidebar();
  renderChat();
  setMobileSidebar(false);
};

clearAllBtn.onclick = clearAllChats;
sendBtn.onclick = sendMessage;

userInput.addEventListener("input", autoResize);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

openSidebarBtn.onclick = () => setMobileSidebar(true);
closeSidebarBtn.onclick = () => setMobileSidebar(false);

document.addEventListener("click", (e) => {
  if (window.innerWidth <= 920) {
    const clickedInsideSidebar = sidebar.contains(e.target);
    const clickedMenu = openSidebarBtn.contains(e.target);
    if (!clickedInsideSidebar && !clickedMenu) {
      setMobileSidebar(false);
    }
  }
});

function init() {
  if (!chats.length) {
    const first = createChat();
    activeChatId = first.id;
  } else if (!activeChatId || !chats.some(c => c.id === activeChatId)) {
    activeChatId = chats[0].id;
  }

  saveChats();
  renderSidebar();
  renderChat();
  autoResize();
}

init();
