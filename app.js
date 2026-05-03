const DEFAULT_API_BASE = "https://rs0hfx59-8003.asse.devtunnels.ms";

const state = {
    apiBase: localStorage.getItem("chat_api_base") || DEFAULT_API_BASE,
    access: localStorage.getItem("chat_access") || "",
    refresh: localStorage.getItem("chat_refresh") || "",
    me: JSON.parse(localStorage.getItem("chat_me") || "null"),
    chats: [],
    activeUserId: Number(localStorage.getItem("chat_selected_user_id")) || null,
    activeConversationId: Number(localStorage.getItem("chat_conv_id")) || null,
    socket: null,
    socketConvId: null,
    manualSocketClose: false,
    reconnectTimer: null,
    renderedMessageIds: new Set(),
    stickToBottom: true,
    mediaRecorder: null,
    audioChunks: [],
    searchTerm: "",
    typingTimer: null,
    reconnectAttempts: 0,
    isRecordingRequested: false,
    theme: localStorage.getItem("chat_theme") || "dark",
};

const el = {
    authOverlay: document.getElementById("authOverlay"),
    showLoginBtn: document.getElementById("showLoginBtn"),
    showRegisterBtn: document.getElementById("showRegisterBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    reloadUsersBtn: document.getElementById("reloadUsersBtn"),
    usersList: document.getElementById("usersList"),
    chatWithTitle: document.getElementById("chatWithTitle"),
    onlineStatus: document.getElementById("onlineStatus"),
    messagesBox: document.getElementById("messagesBox"),
    typingText: document.getElementById("typingText"),
    messageForm: document.getElementById("messageForm"),
    messageInput: document.getElementById("messageInput"),
    toastWrap: document.getElementById("toastWrap"),
    backBtn: document.getElementById("backBtn"),
    shell: document.querySelector(".app-shell"),
    chatAvatar: document.getElementById("chatAvatar"),
    myAvatar: document.getElementById("myAvatar"),
    plusBtn: document.getElementById("plusBtn"),
    attachMenu: document.getElementById("attachMenu"),
    imgInput: document.getElementById("imgInput"),
    voiceBtn: document.getElementById("voiceBtn"),
    userSearch: document.getElementById("userSearch"),
    themeToggle: document.getElementById("themeToggle"),
    themeIcon: document.getElementById("themeIcon"),
};

init();

function init() {
    applyTheme();
    bindEvents();
    updateMePanel();
    if (state.access) bootstrapSession();
}

function bindEvents() {
    el.showLoginBtn.addEventListener("click", () => toggleAuthForm("login"));
    el.showRegisterBtn.addEventListener("click", () => toggleAuthForm("register"));
    el.logoutBtn.addEventListener("click", onLogout);
    el.loginForm.addEventListener("submit", onLogin);
    el.registerForm.addEventListener("submit", onRegister);
    el.messageForm.addEventListener("submit", onSendMessage);
    el.messageInput.addEventListener("input", onTypingInput);
    el.messagesBox.addEventListener("scroll", onMessagesScroll);
    el.backBtn.addEventListener("click", () => el.shell.classList.remove("chat-open"));
    el.plusBtn.addEventListener("click", (e) => { e.stopPropagation(); el.attachMenu.classList.toggle("show"); });
    document.addEventListener("click", () => el.attachMenu.classList.remove("show"));
    el.imgInput.addEventListener("change", onImageSelect);
    el.voiceBtn.addEventListener("mousedown", startVoiceRecording);
    el.voiceBtn.addEventListener("mouseup", stopVoiceRecording);
    el.voiceBtn.addEventListener("touchstart", (e) => { e.preventDefault(); startVoiceRecording(); });
    el.voiceBtn.addEventListener("touchend", (e) => { e.preventDefault(); stopVoiceRecording(); });
    el.userSearch.addEventListener("input", (e) => { state.searchTerm = e.target.value.toLowerCase(); renderChats(); });
    el.themeToggle.addEventListener("click", toggleTheme);
}

function toggleAuthForm(mode) {
    const isLogin = mode === "login";
    el.loginForm.classList.toggle("hidden", !isLogin);
    el.registerForm.classList.toggle("hidden", isLogin);
    el.showLoginBtn.classList.toggle("active", isLogin);
    el.showRegisterBtn.classList.toggle("active", !isLogin);
}

function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("chat_theme", state.theme);
    applyTheme();
}

function applyTheme() {
    const isLight = state.theme === "light";
    document.body.classList.toggle("light-theme", isLight);
    if (isLight) {
        el.themeIcon.innerHTML = '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>';
    } else {
        el.themeIcon.innerHTML = '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
    }
}

async function bootstrapSession() {
    try {
        const meData = await apiCall("/api/auth/me/");
        state.me = meData?.data || meData;
        persistAuth();
        updateMePanel();
        await loadChats({ restoreSelection: true });
        if (state.activeConversationId) connectSocket(state.activeConversationId);
    } catch (_e) { resetSession(); }
}

async function onLogin(event) {
    event.preventDefault();
    const payload = {
        username: document.getElementById("loginUsername").value.trim(),
        password: document.getElementById("loginPassword").value,
    };
    try {
        const data = await apiCall("/api/auth/login/", { method: "POST", body: JSON.stringify(payload), noAuth: true });
        state.access = data?.access || data?.tokens?.access || "";
        state.refresh = data?.refresh || data?.tokens?.refresh || "";
        state.me = data?.user || data?.data || null;
        persistAuth();
        updateMePanel();
        toast("Welcome back!");
        await loadChats({ restoreSelection: true });
    } catch (e) { toast(e.message, true); }
}

async function onRegister(event) {
    event.preventDefault();
    const username = document.getElementById("regUsername").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const password2 = document.getElementById("regPassword2").value;

    if (password !== password2) {
        toast("Passwords do not match", true);
        return;
    }

    const payload = { username, email, password, password2 };
    
    try {
        await apiCall("/api/auth/register/", { method: "POST", body: JSON.stringify(payload), noAuth: true });
        toast("Account created! Please login.");
        toggleAuthForm("login");
    } catch (e) {
        toast(e.message, true);
    }
}

function onLogout() {
    resetSession();
    toast("Logged out");
}

function resetSession() {
    closeSocket(true);
    state.access = state.refresh = "";
    state.me = null;
    state.chats = [];
    state.activeUserId = state.activeConversationId = null;
    state.renderedMessageIds.clear();
    localStorage.clear();
    renderChats();
    updateMePanel();
    renderEmptyChat();
}

async function loadChats(options = {}) {
    if (!state.access) return;
    try {
        const data = await apiCall("/api/conversations/");
        state.chats = Array.isArray(data) ? data : (data?.data || []);
        renderChats();
        if (options.restoreSelection && state.activeUserId) restoreSelection();
    } catch (e) { toast(e.message, true); }
}

function renderChats() {
    const filtered = state.chats.filter(chat => {
        const name = (chat.other_user?.full_name || chat.other_user?.username || "").toLowerCase();
        return name.includes(state.searchTerm);
    });
    el.usersList.innerHTML = "";
    filtered.forEach(chat => {
        const user = chat.other_user;
        if (!user) return;
        const initials = (user.full_name || user.username).substring(0, 1).toUpperCase();
        let lastMsg = "No messages yet";
        if (chat.last_message) {
            if (chat.last_message.message_type === 'image') lastMsg = "📷 Photo";
            else if (chat.last_message.message_type === 'voice') lastMsg = "🎤 Voice message";
            else lastMsg = chat.last_message.text || "";
        }
        const time = chat.last_message ? formatMessageTime(chat.last_message.created_at) : "";
        const unread = chat.unread_count || 0;
        const row = document.createElement("button");
        row.className = `conv-item ${state.activeConversationId === chat.id ? "active" : ""}`;
        row.innerHTML = `
      <div class="avatar">${escapeHtml(initials)}</div>
      <div class="conv-info">
        <div class="conv-top">
          <div class="conv-name">${escapeHtml(user.full_name || user.username)}</div>
          <div class="conv-time">${escapeHtml(time)}</div>
        </div>
        <div class="conv-bottom">
          <div class="conv-msg">${escapeHtml(lastMsg)}</div>
          ${unread > 0 ? `<div class="unread-badge">${unread}</div>` : ""}
        </div>
      </div>
    `;
        row.onclick = () => openConversation(chat.id, user);
        el.usersList.appendChild(row);
    });
}

function restoreSelection() {
    const found = state.chats.find(c => c.other_user?.id === state.activeUserId);
    if (found) openConversation(found.id, found.other_user, { restore: true });
}

async function openConversation(convId, user, options = {}) {
    state.activeUserId = user.id;
    state.activeConversationId = convId;
    localStorage.setItem("chat_selected_user_id", String(user.id));
    localStorage.setItem("chat_conv_id", String(convId));
    const chatIdx = state.chats.findIndex(c => c.id === convId);
    if (chatIdx !== -1) {
        state.chats[chatIdx].unread_count = 0;
        renderChats();
    }
    if (window.innerWidth <= 800) el.shell.classList.add("chat-open");
    el.chatWithTitle.textContent = user.full_name || user.username;
    el.onlineStatus.textContent = "offline";
    el.onlineStatus.classList.remove("online");
    el.chatAvatar.textContent = (user.full_name || user.username).substring(0, 1).toUpperCase();
    if (!options.restore) await loadMessages(convId);
    connectSocket(convId);
}

async function loadMessages(convId) {
    try {
        const list = await apiCall(`/api/conversations/${convId}/messages/`);
        state.renderedMessageIds.clear();
        el.messagesBox.innerHTML = "";
        (Array.isArray(list) ? list : []).forEach(m => appendMessage(m));
        scrollToBottom();
    } catch (e) { toast(e.message, true); }
}

function connectSocket(convId) {
    if (!state.access) return;
    if (state.socket?.readyState === WebSocket.OPEN && state.socketConvId === convId) {
        state.socket.send(jsonStr({ action: "mark_read" }));
        return;
    }
    if (state.socket) closeSocket(true);
    state.socketConvId = convId;
    const ws = new WebSocket(buildWsUrl(`/ws/chat/${convId}/?token=${encodeURIComponent(state.access)}`));
    state.socket = ws;
    ws.onopen = () => {
        state.reconnectAttempts = 0;
        ws.send(jsonStr({ action: "mark_read" }));
        ws.send(jsonStr({ action: "presence_ping" }));
        loadChats();
    };
    ws.onmessage = (e) => handleSocketPayload(JSON.parse(e.data));
    ws.onclose = () => {
        if (!state.manualSocketClose) {
            const delay = Math.min(3000 * (state.reconnectAttempts + 1), 30000);
            state.reconnectTimer = setTimeout(() => connectSocket(convId), delay);
            state.reconnectAttempts++;
        }
    };
}

function closeSocket(manual = true) {
    state.manualSocketClose = manual;
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
    if (state.socket) state.socket.close();
    state.socket = null;
}

function handleSocketPayload(p) {
    if (p.type === "message") {
        const optimistic = el.messagesBox.querySelector(".message.optimistic");
        if (optimistic) optimistic.remove();
        appendMessage(p);
        if (state.stickToBottom) scrollToBottom();
        if (p.sender_id !== state.me?.id) {
            state.socket?.send(jsonStr({ action: "seen", message_id: p.id }));
            state.socket?.send(jsonStr({ action: "mark_read" }));
        }
        loadChats();
    } else if (p.type === "typing") {
        el.typingText.textContent = p.is_typing ? "typing..." : "";
    } else if (p.type === "seen") {
        updateSeenStatus(p.message_id);
    } else if (p.type === "reaction") {
        const msgEl = el.messagesBox.querySelector(`[data-message-id='${p.message_id}']`);
        if (msgEl) renderReactions(msgEl, p.reactions);
    } else if (p.type === "status") {
        if (p.user_id !== state.me?.id) {
            const isOnline = p.status === "online";
            el.onlineStatus.textContent = isOnline ? "online" : "offline";
            el.onlineStatus.classList.toggle("online", isOnline);
        }
    } else if (p.type === "presence_query") {
        state.socket?.send(jsonStr({ action: "presence_pong" }));
    } else if (p.type === "message_status") {
        if (p.status === "delivered" || p.status === "seen") {
            const msg = el.messagesBox.querySelector(`[data-message-id='${p.message_id}']`);
            if (msg) {
                const icon = msg.querySelector(".status-icon");
                if (icon) icon.textContent = p.status === "seen" ? "✓✓" : "✓";
                if (p.status === "seen") icon.style.color = "var(--seen-blue)";
            }
        }
    }
}

function onSendMessage(e) {
    e.preventDefault();
    const text = el.messageInput.value.trim();
    if (!text || state.socket?.readyState !== WebSocket.OPEN) return;
    const optimisticMsg = {
        id: Date.now(),
        sender_id: state.me.id,
        text,
        created_at: new Date().toISOString(),
        status: "sending",
        optimistic: true,
        message_type: "text"
    };
    appendMessage(optimisticMsg);
    scrollToBottom();
    state.socket.send(jsonStr({ action: "send_message", text }));
    el.messageInput.value = "";
}

function onTypingInput() {
    if (state.socket?.readyState !== WebSocket.OPEN) return;
    state.socket.send(jsonStr({ action: "typing", is_typing: true }));
    if (state.typingTimer) clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
        if (state.socket?.readyState === WebSocket.OPEN)
            state.socket.send(jsonStr({ action: "typing", is_typing: false }));
    }, 1500);
}

function appendMessage(m) {
    const id = Number(m.id);
    if (id && state.renderedMessageIds.has(id)) return;
    if (id) state.renderedMessageIds.add(id);
    const mine = (m.sender_id || m.sender?.id) === state.me?.id;
    const row = document.createElement("div");
    row.className = `message ${mine ? "mine" : "other"} ${m.optimistic ? "optimistic" : ""}`;
    row.dataset.messageId = String(id || "");
    const time = formatMessageTime(m.created_at || m.time);
    let fileUrl = m.file;
    if (fileUrl && !fileUrl.startsWith("http") && !fileUrl.startsWith("blob:")) {
        const separator = (state.apiBase.endsWith("/") || fileUrl.startsWith("/")) ? "" : "/";
        fileUrl = state.apiBase + separator + fileUrl;
    }
    let contentHtml = "";
    if (m.message_type === "image") {
        contentHtml = `<img src="${fileUrl}" class="msg-image" ${m.optimistic ? 'style="opacity:0.6"' : `onclick="window.open('${fileUrl}', '_blank')"`} />`;
    } else if (m.message_type === "voice") {
        contentHtml = `<audio src="${fileUrl}" controls class="msg-audio" preload="auto"></audio>`;
    } else {
        contentHtml = `<div class="msg-text">${escapeHtml(m.text || "")}</div>`;
    }
    const isSeen = m.status === 'seen';
    const statusIcon = mine ? `<span class="status-icon" style="${isSeen ? 'color: var(--seen-blue)' : ''}">${isSeen ? '✓✓' : (m.status === 'sending' ? '⏳' : '✓')}</span>` : "";
    const isEdited = m.is_edited || false;

    let editTriggerHtml = "";
    if (mine && m.message_type === "text" && !m.optimistic) {
        editTriggerHtml = `
        <div class="edit-trigger" title="Edit message">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </div>`;
    }

    row.innerHTML = `
    <div class="react-trigger">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
    </div>
    <div class="reaction-picker">
      <span class="react-emoji" data-emoji="👍">👍</span>
      <span class="react-emoji" data-emoji="❤️">❤️</span>
      <span class="react-emoji" data-emoji="😂">😂</span>
      <span class="react-emoji" data-emoji="😮">😮</span>
      <span class="react-emoji" data-emoji="😢">😢</span>
      <span class="react-emoji" data-emoji="🙏">🙏</span>
    </div>
    ${editTriggerHtml}
    <div class="msg-content-wrapper">
        ${contentHtml}
    </div>
    <div class="reactions-list"></div>
    <div class="msg-meta">
      ${isEdited ? '<span class="edited-label">(edited)</span>' : ''}
      <span>${escapeHtml(time)}</span>
      ${statusIcon}
    </div>
  `;
    if (!m.optimistic && id) {
        const trigger = row.querySelector(".react-trigger");
        const picker = row.querySelector(".reaction-picker");
        trigger.onclick = (e) => { e.stopPropagation(); picker.classList.toggle("show"); };
        row.querySelectorAll(".react-emoji").forEach(em => {
            em.onclick = () => {
                if (state.socket?.readyState === WebSocket.OPEN)
                    state.socket.send(jsonStr({ action: "react", message_id: id, emoji: em.dataset.emoji }));
                picker.classList.remove("show");
            };
        });

        const editBtn = row.querySelector(".edit-trigger");
        if (editBtn) {
            editBtn.onclick = (e) => {
                e.stopPropagation();
                enterEditMode(row, m);
            };
        }
    }
    renderReactions(row, m.reactions || []);
    el.messagesBox.appendChild(row);
    if (m.optimistic) row.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function enterEditMode(row, m) {
    const wrapper = row.querySelector(".msg-content-wrapper");
    const originalContent = wrapper.innerHTML;
    const originalText = m.text;

    wrapper.innerHTML = `
        <div class="edit-input-container">
            <input type="text" class="edit-input" value="${escapeHtml(originalText)}" />
            <div class="edit-actions">
                <button class="edit-btn edit-cancel">Cancel</button>
                <button class="edit-btn edit-save">Save</button>
            </div>
        </div>
    `;

    const input = wrapper.querySelector(".edit-input");
    input.focus();
    input.onkeydown = (e) => {
        if (e.key === "Enter") saveEdit(row, m, input.value, originalContent);
        if (e.key === "Escape") cancelEdit(wrapper, originalContent);
    };

    wrapper.querySelector(".edit-cancel").onclick = () => cancelEdit(wrapper, originalContent);
    wrapper.querySelector(".edit-save").onclick = () => saveEdit(row, m, input.value, originalContent);
}

function cancelEdit(wrapper, originalContent) {
    wrapper.innerHTML = originalContent;
}

async function saveEdit(row, m, newText, originalContent) {
    const wrapper = row.querySelector(".msg-content-wrapper");
    newText = newText.trim();
    if (!newText || newText === m.text) {
        cancelEdit(wrapper, originalContent);
        return;
    }

    // Try with /api prefix first, as it is standard for this app
    let url = `/api/conversations/${state.activeConversationId}/messages/${m.id}/edit/`;

    try {
        const data = await apiCall(url, {
            method: "PATCH",
            body: JSON.stringify({ text: newText })
        });

        // Update local object
        m.text = data.text || newText;
        m.is_edited = true;

        // Update UI
        wrapper.innerHTML = `<div class="msg-text">${escapeHtml(m.text)}</div>`;
        const meta = row.querySelector(".msg-meta");
        if (!meta.querySelector(".edited-label")) {
            const label = document.createElement("span");
            label.className = "edited-label";
            label.textContent = "(edited)";
            meta.insertBefore(label, meta.firstChild);
        }
        toast("Message updated");
    } catch (e) {
        toast(e.message, true);
        cancelEdit(wrapper, originalContent);
    }
}

function renderReactions(msgEl, reactions) {
    const list = msgEl.querySelector(".reactions-list");
    if (!list) return;
    list.innerHTML = "";
    if (!reactions || !reactions.length) return;
    const groups = {};
    reactions.forEach(r => {
        const emoji = r.emoji;
        if (!groups[emoji]) groups[emoji] = { count: 0, me: false };
        groups[emoji].count++;
        if ((r.user === state.me?.id) || (r.user?.id === state.me?.id)) groups[emoji].me = true;
    });
    Object.entries(groups).forEach(([emoji, data]) => {
        const badge = document.createElement("div");
        badge.className = `reaction-badge ${data.me ? 'mine' : ''}`;
        badge.innerHTML = `<span>${emoji}</span>${data.count > 1 ? `<span>${data.count}</span>` : ""}`;
        badge.onclick = () => {
            if (state.socket?.readyState === WebSocket.OPEN)
                state.socket.send(jsonStr({ action: "react", message_id: msgEl.dataset.messageId, emoji }));
        };
        list.appendChild(badge);
    });
}

async function onImageSelect(e) {
    const file = e.target.files[0];
    if (!file || !state.activeConversationId) return;
    const tempUrl = URL.createObjectURL(file);
    appendMessage({
        id: 0,
        sender_id: state.me?.id,
        message_type: "image",
        file: tempUrl,
        created_at: new Date().toISOString(),
        status: "sending",
        optimistic: true
    });
    scrollToBottom();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("message_type", "image");
    try {
        await uploadFile(formData);
        el.imgInput.value = "";
    } catch (err) {
        toast(err.message, true);
        const opt = el.messagesBox.querySelector(".message.optimistic");
        if (opt) opt.remove();
    }
}

// ─── FIXED: Voice Recording with proper MIME type detection ───────────────────
function getBestAudioMimeType() {
    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ""; // fallback: let browser decide
}

function mimeTypeToExtension(mimeType) {
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("mp4")) return "mp4";
    return "webm"; // default
}

async function startVoiceRecording() {
    if (!state.activeConversationId) return;
    if (state.isRecordingRequested) return;
    state.isRecordingRequested = true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const mimeType = getBestAudioMimeType();
        state.mediaRecorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);

        state.audioChunks = [];
        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) state.audioChunks.push(e.data);
        };

        state.mediaRecorder.onstop = async () => {
            state.isRecordingRequested = false;
            if (state.audioChunks.length === 0) return;

            const usedMime = state.mediaRecorder.mimeType || mimeType || "audio/webm";
            const ext = mimeTypeToExtension(usedMime);
            const blob = new Blob(state.audioChunks, { type: usedMime });

            const tempUrl = URL.createObjectURL(blob);
            appendMessage({
                id: 0,
                sender_id: state.me?.id,
                message_type: "voice",
                file: tempUrl,
                created_at: new Date().toISOString(),
                status: "sending",
                optimistic: true
            });
            scrollToBottom();

            const formData = new FormData();
            formData.append("file", blob, `voice.${ext}`);
            formData.append("message_type", "voice");

            try {
                await uploadFile(formData);
            } catch (err) {
                toast(err.message, true);
                const opt = el.messagesBox.querySelector(".message.optimistic");
                if (opt) opt.remove();
            }
            stream.getTracks().forEach(t => t.stop());
        };

        state.mediaRecorder.start(250); // collect chunks every 250ms for reliability
        el.voiceBtn.style.color = "#f44336";
        el.voiceBtn.classList.add("recording");
        toast("Recording...");

        // Auto-stop after 60 seconds
        setTimeout(() => {
            if (state.mediaRecorder?.state === "recording") stopVoiceRecording();
        }, 60000);

    } catch (err) {
        state.isRecordingRequested = false;
        toast("Microphone access denied", true);
    }
}

function stopVoiceRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
        state.mediaRecorder.stop();
        el.voiceBtn.style.color = "";
        el.voiceBtn.classList.remove("recording");
        toast("Sending voice message...");
    } else {
        state.isRecordingRequested = false;
    }
}
// ─────────────────────────────────────────────────────────────────────────────

async function uploadFile(formData) {
    const res = await fetch(`${state.apiBase}/api/conversations/${state.activeConversationId}/upload/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${state.access}` },
        body: formData
    });
    if (!res.ok) throw new Error("Upload failed");
    return await res.json();
}

function formatMessageTime(value) {
    if (!value) return "";
    let date = new Date(value);
    if (isNaN(date.getTime()) && typeof value === "string" && !value.endsWith("Z")) {
        date = new Date(value + "Z");
    }
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function onMessagesScroll() {
    const { scrollTop, scrollHeight, clientHeight } = el.messagesBox;
    state.stickToBottom = (scrollHeight - scrollTop - clientHeight) < 80;
}

function updateSeenStatus(mid) {
    const msg = el.messagesBox.querySelector(`[data-message-id='${mid}']`);
    if (msg) {
        const icon = msg.querySelector(".status-icon");
        if (icon) { icon.textContent = "✓✓"; icon.style.color = "var(--seen-blue)"; }
    }
    loadChats();
}

function renderEmptyChat() {
    el.messagesBox.innerHTML = `<div class="welcome-screen"><div class="welcome-center"><h1>ChatApp Web</h1><p>End‑to‑end encrypted messages</p><div class="enc-footer"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8H9V7c0-1.654 1.346-3 3-3s3 1.346 3 3v3z"/></svg> Secured by Signal protocol</div></div></div>`;
    el.onlineStatus.textContent = ""; el.onlineStatus.classList.remove("online");
}

function updateMePanel() {
    const loggedIn = !!state.me;
    el.authOverlay.classList.toggle("hidden", loggedIn);
    if (loggedIn) el.myAvatar.textContent = (state.me.full_name || state.me.username).substring(0, 1).toUpperCase();
}

async function apiCall(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (!options.noAuth && state.access) headers.Authorization = `Bearer ${state.access}`;
    const res = await fetch(`${state.apiBase}${path}`, { method: options.method || "GET", headers, body: options.body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        let msg = "Request failed";
        if (data.detail) msg = data.detail;
        else if (data.error) msg = data.error;
        else if (data.message) msg = data.message;
        else if (typeof data === 'object') msg = JSON.stringify(data);
        
        throw new Error(`${msg} (Status: ${res.status})`);
    }
    return data;
}

function buildWsUrl(p) { const u = new URL(state.apiBase); u.protocol = u.protocol === "https:" ? "wss:" : "ws:"; return `${u.origin}${p}`; }
function persistAuth() { localStorage.setItem("chat_access", state.access); localStorage.setItem("chat_refresh", state.refresh); localStorage.setItem("chat_me", JSON.stringify(state.me)); }
function scrollToBottom() { el.messagesBox.scrollTop = el.messagesBox.scrollHeight; }
function toast(t, isError = false) { const div = document.createElement("div"); div.className = `toast${isError ? " error" : ""}`; div.textContent = t; el.toastWrap.appendChild(div); setTimeout(() => div.remove(), 3000); }
function escapeHtml(str) { return String(str).replace(/[&<>]/g, function (m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }
function jsonStr(obj) { return JSON.stringify(obj); }
