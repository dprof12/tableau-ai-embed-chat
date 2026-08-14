/**
 * BI Portal Parent Controller - Chatbot & Iframe Sync Coordinator
 */

// Application State
const state = {
  currentDashboardData: null,
  chatHistory: [],
  isSending: false
};

// DOM Elements
const elements = {
  tableauIframe: document.getElementById('tableauIframe'),
  currentVizTitle: document.getElementById('currentVizTitle'),
  btnDashA: document.getElementById('btnDashA'),
  btnDashB: document.getElementById('btnDashB'),
  realIframeUrl: document.getElementById('realIframeUrl'),
  loadRealIframeBtn: document.getElementById('loadRealIframeBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  chatScrollContainer: document.getElementById('chatScrollContainer'),
  chatMessagesLog: document.getElementById('chatMessagesLog'),
  typingIndicator: document.getElementById('typingIndicator'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  clearChatBtn: document.getElementById('clearChatBtn'),
  suggestionsPanel: document.getElementById('suggestionsPanel')
};

// Initialize listeners on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  attachParentEventListeners();
});

/**
 * 1. Listen for PostMessage from Tableau Extension (inside Iframe)
 */
window.addEventListener('message', (event) => {
  // Safe-guard to process only sync payloads
  if (event.data && event.data.type === 'TABLEAU_DATA_SYNC') {
    const data = event.data;
    console.log('Synchronized payload received from Tableau:', data);

    // Detect if this is a new dashboard context to clean old chat sessions
    if (!state.currentDashboardData) {
      resetChatHistory();
      appendBotMessage(`🟢 **Koneksi Sukses**: Berhasil terhubung ke **${elements.currentVizTitle.textContent}**.`);
      appendBotMessage("Data terbaru telah disinkronisasikan ke portal ini secara real-time. Silakan ajukan pertanyaan Anda!");
    }

    state.currentDashboardData = {
      dashboardName: elements.currentVizTitle.textContent,
      sheetsData: data.sheetsData
    };

    // Update Connection Status UI
    const dot = elements.connectionStatus.querySelector('.status-indicator-dot');
    dot.className = 'status-indicator-dot green';
    elements.connectionStatus.querySelector('.status-label-text').innerHTML = `🟢 Terkoneksi: <strong>${elements.currentVizTitle.textContent}</strong>`;

    // Enable chat form controls
    elements.chatInput.disabled = false;
    elements.chatInput.placeholder = "Tanyakan data dashboard di sini...";
    elements.sendBtn.disabled = false;
  }
});

/**
 * 2. Attach UI Event Listeners
 */
function attachParentEventListeners() {
  // Navigation Dashboard A (Passenger)
  elements.btnDashA.addEventListener('click', () => {
    setActiveNavButton(elements.btnDashA);
    elements.currentVizTitle.textContent = 'Jumlah Penumpang Angkutan Umum yang Terlayani';
    elements.tableauIframe.src = 'https://analytic.jakarta.go.id/views/DashboardPerhubungantesAI/12_1_1_12?:embed=y&:showVizHome=no&:toolbar=no';
    elements.realIframeUrl.value = '';
    
    // Force reset chat and clear state immediately on navigation
    resetChatHistory();
    state.currentDashboardData = null;
    setConnectingState();
  });

  // Navigation Dashboard B (Dashboard Lainnya)
  elements.btnDashB.addEventListener('click', () => {
    setActiveNavButton(elements.btnDashB);
    elements.currentVizTitle.textContent = 'Jumlah Penumpang Angkutan Umum Berbasis Perairan';
    elements.tableauIframe.src = 'https://analytic.jakarta.go.id/views/DashboardPerhubungantesAI/12_1_1_33?:embed=y&:showVizHome=no&:toolbar=no';
    elements.realIframeUrl.value = '';
    
    // Force reset chat and clear state immediately on navigation
    resetChatHistory();
    state.currentDashboardData = null;
    setConnectingState();
  });

  // Custom Iframe Loader (For user's actual dashboards)
  elements.loadRealIframeBtn.addEventListener('click', () => {
    const url = elements.realIframeUrl.value.trim();
    if (url) {
      setActiveNavButton(null);
      elements.currentVizTitle.textContent = 'Dashboard Tableau Riil';
      elements.tableauIframe.src = url;
      
      // Force reset chat and clear state immediately on navigation
      resetChatHistory();
      state.currentDashboardData = null;
      setConnectingState();
    }
  });

  // Send message submit
  elements.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleUserMessageSubmit();
  });

  // Suggestion chips
  elements.suggestionsPanel.addEventListener('click', (e) => {
    const chip = e.target.closest('.suggest-chip-btn');
    if (chip && !state.isSending && state.currentDashboardData) {
      elements.chatInput.value = chip.getAttribute('data-query');
      handleUserMessageSubmit();
    }
  });

  // Clear chat
  elements.clearChatBtn.addEventListener('click', () => {
    if (confirm('Apakah Anda ingin membersihkan riwayat percakapan?')) {
      resetChatHistory();
      if (state.currentDashboardData) {
        appendBotMessage(`Terkoneksi ke dataset: **${state.currentDashboardData.dashboardName}**.`);
      }
    }
  });
}

/**
 * 3. Handle Message Q&A Processing
 */
async function handleUserMessageSubmit() {
  const query = elements.chatInput.value.trim();
  if (!query || state.isSending || !state.currentDashboardData) return;

  state.isSending = true;
  elements.chatInput.value = '';
  elements.chatInput.disabled = true;
  elements.sendBtn.disabled = true;

  // Append user bubble
  appendUserMessage(query);
  scrollToBottom();

  // Show typing state
  showTypingIndicator(true);

  try {
    const payload = {
      dashboardName: state.currentDashboardData.dashboardName,
      sheetsData: state.currentDashboardData.sheetsData,
      message: query,
      chatHistory: state.chatHistory
    };

    // Call Vercel serverless endpoint
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    showTypingIndicator(false);

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Server error: ${response.status}`);
    }

    // Append AI reply
    appendBotMessage(result.reply);

    // Save to conversation history
    state.chatHistory.push({ role: 'user', content: query });
    state.chatHistory.push({ role: 'model', content: result.reply });

  } catch (err) {
    console.error('Chat execution failed:', err);
    showTypingIndicator(false);
    appendSystemAlert(`Error: ${err.message}`);
  } finally {
    state.isSending = false;
    elements.chatInput.disabled = false;
    elements.sendBtn.disabled = false;
    elements.chatInput.focus();
    scrollToBottom();
  }
}

/**
 * 4. UI Helpers
 */
function setActiveNavButton(activeButton) {
  elements.btnDashA.classList.remove('active');
  elements.btnDashB.classList.remove('active');
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

function setConnectingState() {
  const dot = elements.connectionStatus.querySelector('.status-indicator-dot');
  dot.className = 'status-indicator-dot red';
  elements.connectionStatus.querySelector('.status-label-text').textContent = '🔴 Menunggu Koneksi Iframe...';
  
  elements.chatInput.disabled = true;
  elements.chatInput.placeholder = "Silakan koneksikan data dashboard...";
  elements.sendBtn.disabled = true;
}

function appendUserMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble user-bubble';
  
  const content = document.createElement('div');
  content.className = 'bubble-content';
  content.textContent = text;
  
  const time = document.createElement('span');
  time.className = 'bubble-time';
  const now = new Date();
  time.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  bubble.appendChild(content);
  bubble.appendChild(time);
  elements.chatMessagesLog.appendChild(bubble);
}

function appendBotMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble bot-bubble';
  
  const content = document.createElement('div');
  content.className = 'bubble-content';

  if (typeof marked !== 'undefined' && marked.parse) {
    content.innerHTML = marked.parse(text);
  } else {
    content.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
  }
  
  const time = document.createElement('span');
  time.className = 'bubble-time';
  const now = new Date();
  time.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  bubble.appendChild(content);
  bubble.appendChild(time);
  elements.chatMessagesLog.appendChild(bubble);
}

function appendSystemAlert(text) {
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble bot-bubble';
  
  const content = document.createElement('div');
  content.className = 'bubble-content';
  content.style.backgroundColor = '#fffbeb';
  content.style.borderColor = '#fef3c7';
  content.style.color = '#b45309';
  content.innerHTML = `<p>⚠️ ${text}</p>`;

  bubble.appendChild(content);
  elements.chatMessagesLog.appendChild(bubble);
}

function showTypingIndicator(show) {
  if (show) {
    elements.typingIndicator.classList.remove('hidden');
  } else {
    elements.typingIndicator.classList.add('hidden');
  }
  scrollToBottom();
}

function scrollToBottom() {
  setTimeout(() => {
    elements.chatScrollContainer.scrollTop = elements.chatScrollContainer.scrollHeight;
  }, 50);
}

function resetChatHistory() {
  state.chatHistory = [];
  elements.chatMessagesLog.innerHTML = '';
}
