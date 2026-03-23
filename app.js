let chats = JSON.parse(localStorage.getItem('chats')) || [];
let currentChat = [];
let currentIndex = null;

function saveChats() {
  localStorage.setItem('chats', JSON.stringify(chats));
}

function renderSidebar(list = chats) {
  const container = document.getElementById('chatList');
  container.innerHTML = '';

  list.forEach((chat, i) => {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.innerText = chat[0]?.text?.slice(0, 25) || 'New Chat';
    div.onclick = () => loadChat(i);
    container.appendChild(div);
  });
}

function renderMessages() {
  const box = document.getElementById('messages');
  box.innerHTML = '';

  currentChat.forEach(msg => {
    const wrapper = document.createElement('div');
    wrapper.className = 'message ' + msg.role;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerText = msg.role === 'ai' ? 'AI' : 'U';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerText = msg.text;

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    box.appendChild(wrapper);
  });

  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('input');
  const text = input.value.trim();
  if (!text) return;

  currentChat.push({ role: 'user', text });
  renderMessages();
  input.value = '';

  const aiMsg = { role: 'ai', text: 'Typing...' };
  currentChat.push(aiMsg);
  renderMessages();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: currentChat })
    });

    const data = await res.json();
    aiMsg.text = data.reply;

  } catch (e) {
    aiMsg.text = 'Error';
  }

  if (currentIndex === null) {
    chats.push(currentChat);
    currentIndex = chats.length - 1;
  } else {
    chats[currentIndex] = currentChat;
  }

  saveChats();
  renderSidebar();
  renderMessages();
}

function newChat() {
  currentChat = [];
  currentIndex = null;
  renderMessages();
}

function loadChat(i) {
  currentChat = chats[i];
  currentIndex = i;
  renderMessages();
}

function searchChats(q) {
  const filtered = chats.filter(c =>
    JSON.stringify(c).toLowerCase().includes(q.toLowerCase())
  );
  renderSidebar(filtered);
}

function toggleTheme() {
  document.body.classList.toggle('light');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('show');
}

renderSidebar();
