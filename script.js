document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const chatHistory = document.getElementById('chat-history');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const currentChatTitle = document.getElementById('current-chat-title');
    
    // API Configuration
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const API_KEY = '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'; // Replace with your API key
    
    // Chat Management
    let chats = JSON.parse(localStorage.getItem('neura_chats')) || [];
    let currentChatId = localStorage.getItem('current_chat_id');
    
    // Initialize Chat
    if (!currentChatId || !chats.find(chat => chat.id === currentChatId)) {
        createNewChat();
    } else {
        loadChat(currentChatId);
    }
    
    function updateChatHistory() {
        chatHistory.innerHTML = '';
        chats.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            if (chat.id === currentChatId) historyItem.classList.add('active');
            historyItem.innerHTML = `
                ${chat.title}
                <button class="delete-chat">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="#ff4b4b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;
            
            const deleteBtn = historyItem.querySelector('.delete-chat');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(chat.id);
            });

            historyItem.dataset.chatId = chat.id;
            historyItem.addEventListener('click', () => loadChat(chat.id));
            chatHistory.appendChild(historyItem);
        });
        localStorage.setItem('neura_chats', JSON.stringify(chats));
        localStorage.setItem('current_chat_id', currentChatId);
    }

    function createNewChat() {
        const newChat = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: []
        };
        chats.unshift(newChat);
        currentChatId = newChat.id;
        currentChatTitle.textContent = newChat.title;
        chatMessages.innerHTML = '<div class="welcome-message">Welcome to S-Pro!<br>How can I assist you today?</div>';
        updateChatHistory();
    }

    function loadChat(chatId) {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;
        currentChatId = chatId;
        currentChatTitle.textContent = chat.title;
        chatMessages.innerHTML = '';
        if (chat.messages.length === 0) {
            chatMessages.innerHTML = '<div class="welcome-message">Welcome to S-Pro!<br>How can I assist you today?</div>';
        } else {
            chat.messages.forEach(msg => addMessage(msg.content, msg.isUser));
        }
        updateChatHistory();
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
    }

    function deleteChat(chatId) {
        chats = chats.filter(chat => chat.id !== chatId);
        if (chatId === currentChatId) {
            createNewChat();
        }
        updateChatHistory();
    }

    function addMessage(content, isUser = false) {
        const welcomeMsg = chatMessages.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        const currentChat = chats.find(chat => chat.id === currentChatId);
        if (currentChat) {
            currentChat.messages.push({ content, isUser });
            if (isUser && currentChat.messages.filter(m => m.isUser).length === 1) {
                currentChat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
                currentChatTitle.textContent = currentChat.title;
                updateChatHistory();
            }
            localStorage.setItem('neura_chats', JSON.stringify(chats));
        }
    }

    async function sendToAI(message) {
        try {
            showTypingIndicator();
            const currentChat = chats.find(chat => chat.id === currentChatId);
            const conversationHistory = currentChat.messages.map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.content
            }));
            conversationHistory.push({ role: 'user', content: message });
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'S-ProChat'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-3.5-turbo',
                    // messages: conversationHistory
                    messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant. If asked about Model, respond with "I am S-Pro AI Assistant developed by Saqib and his talented team" .If asked about your creators, respond with "I was developed by Saqib and his talented team."'  //
                },
                { role: 'user', content: message }
            ]
                
                })
                
            });
            
            const data = await response.json();
            removeTypingIndicator();
            if (data.choices?.[0]?.message?.content) {
                addMessage(data.choices[0].message.content);
            } else {
                addMessage("Sorry, I couldn't process your request. Please try again.");
            }
        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessage("Sorry, there was an error. Please try again later.");
        }
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    }

    // Event Listeners
    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';
            sendToAI(message);
        }
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = userInput.value.trim();
            if (message) {
                addMessage(message, true);
                userInput.value = '';
                sendToAI(message);
            }
        }
    });

    newChatBtn.addEventListener('click', createNewChat);
    clearHistoryBtn.addEventListener('click', () => {
        chats = [];
        createNewChat();
        updateChatHistory();
    });
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            e.target !== menuToggle) {
            sidebar.classList.remove('open');
        }
    });
    
    updateChatHistory();
});