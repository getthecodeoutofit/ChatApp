// Initialize socket connection
var socket = io();

// DOM Elements - Authentication
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const registerUsername = document.getElementById('register-username');
const registerPassword = document.getElementById('register-password');
const registerConfirmPassword = document.getElementById('register-confirm-password');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const currentUserDisplay = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');

// DOM Elements - Tabs
const tabFriends = document.getElementById('tab-friends');
const tabRequests = document.getElementById('tab-requests');
const tabFind = document.getElementById('tab-find');
const friendsTab = document.getElementById('friends-tab');
const requestsTab = document.getElementById('requests-tab');
const findTab = document.getElementById('find-tab');

// DOM Elements - Friends and Chat
const friendsList = document.getElementById('friends_list');
const friendRequestsList = document.getElementById('friend_requests_list');
const searchResultsList = document.getElementById('search_results_list');
const userSearchInput = document.getElementById('user-search');
const searchBtn = document.getElementById('search-btn');
const noChatSelected = document.getElementById('no-chat-selected');
const chatContainer = document.getElementById('chat-container');
const chatRecipient = document.getElementById('chat-recipient');
const chatDisplay = document.getElementById('chat');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('send_message_btn');

// DOM Elements - Rooms (keeping for backward compatibility)
const userlist = document.getElementById("active_users_list");
const roomlist = document.getElementById('active_rooms_list');
const roomInput = document.getElementById('roomInput');
const createRoomBtn = document.getElementById('room_add_icon_holder');

// Global variables
var currentRoom = "global";
var myUsername = "";
var myPrivateKey = "";
var currentChatRecipient = null;

// Function to encrypt a message
function encryptMessage(message, privateKey) {
  try {
    // In a real app, you would use a proper encryption library
    // For this example, we'll use a simple Base64 encoding as a placeholder
    return btoa(message);
  } catch (error) {
    console.error('Encryption error:', error);
    return message;
  }
}

// Function to decrypt a message
function decryptMessage(encryptedMessage, privateKey) {
  try {
    // In a real app, you would use a proper decryption library
    // For this example, we'll use a simple Base64 decoding as a placeholder
    return atob(encryptedMessage);
  } catch (error) {
    console.error('Decryption error:', error);
    return "[Encrypted Message]";
  }
}

// Show register form
showRegisterLink.addEventListener('click', function(e) {
  e.preventDefault();
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

// Show login form
showLoginLink.addEventListener('click', function(e) {
  e.preventDefault();
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

// Handle login
loginBtn.addEventListener('click', function() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Please enter both username and password';
    return;
  }

  socket.emit('login', { username, password });
});

// Handle registration
registerBtn.addEventListener('click', function() {
  const username = registerUsername.value.trim();
  const password = registerPassword.value.trim();
  const confirmPassword = registerConfirmPassword.value.trim();

  if (!username || !password || !confirmPassword) {
    registerError.textContent = 'Please fill in all fields';
    return;
  }

  if (password !== confirmPassword) {
    registerError.textContent = 'Passwords do not match';
    return;
  }

  socket.emit('register', { username, password });
});

// Handle logout
logoutBtn.addEventListener('click', function() {
  socket.emit('logout');
  authSection.classList.remove('hidden');
  chatSection.classList.add('hidden');
  myUsername = '';
  myPrivateKey = '';
  currentChatRecipient = null;

  // Clear input fields
  loginUsername.value = '';
  loginPassword.value = '';
  registerUsername.value = '';
  registerPassword.value = '';
  registerConfirmPassword.value = '';
  loginError.textContent = '';
  registerError.textContent = '';
});

// Tab switching
tabFriends.addEventListener('click', function() {
  activateTab(tabFriends, friendsTab);
});

tabRequests.addEventListener('click', function() {
  activateTab(tabRequests, requestsTab);
});

tabFind.addEventListener('click', function() {
  activateTab(tabFind, findTab);
});

function activateTab(tabButton, tabContent) {
  // Deactivate all tabs
  [tabFriends, tabRequests, tabFind].forEach(tab => tab.classList.remove('active'));
  [friendsTab, requestsTab, findTab].forEach(tab => tab.classList.add('hidden'));

  // Activate selected tab
  tabButton.classList.add('active');
  tabContent.classList.remove('hidden');
}

// Search for users
searchBtn.addEventListener('click', function() {
  const searchQuery = userSearchInput.value.trim();
  if (searchQuery) {
    socket.emit('searchUsers', searchQuery);
  }
});

// Send private message
sendMessageBtn.addEventListener('click', function() {
  if (!currentChatRecipient) return;

  const message = messageInput.value.trim();
  if (message) {
    socket.emit('sendPrivateMessage', {
      recipient: currentChatRecipient,
      message: message
    });

    // Display the message in the chat (optimistic UI update)
    // We'll update the message ID when we get confirmation
    displayMessage('You', message, true);

    messageInput.value = '';
  }
});

// Handle message sent confirmation
socket.on('messageSent', function(data) {
  console.log('Message sent successfully:', data);

  // If we have a message ID, we could update the optimistically displayed message
  // with the correct ID for future reference
  if (data.id) {
    // Find the last message from the current user and update its ID
    const messages = chatDisplay.querySelectorAll('.message_holder.me');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.setAttribute('data-message-id', data.id);

      // Update the delete button with the correct message ID
      const deleteButton = lastMessage.querySelector('.delete-message-btn');
      if (deleteButton) {
        deleteButton.setAttribute('onclick', `deleteMessage('${data.id}')`);
      }
    }
  }
});

// Handle message deleted confirmation
socket.on('messageDeleted', function(data) {
  console.log('Message deleted:', data);

  // Find and remove the message element
  const messageElement = document.querySelector(`.message_holder[data-message-id="${data.messageId}"]`);
  if (messageElement) {
    // Add a fade-out animation
    messageElement.classList.add('message-deleted');

    // Remove the element after animation completes
    setTimeout(() => {
      messageElement.remove();
    }, 500);
  }
});

// Handle message deletion error
socket.on('deleteError', function(data) {
  console.error('Error deleting message:', data);
  alert(`Error: ${data.message}`);
});

// Send message on enter key press
messageInput.addEventListener('keyup', function(event) {
  if (event.key === 'Enter') {
    sendMessageBtn.click();
  }
});

// Create new room on button click (keeping for backward compatibility)
createRoomBtn.addEventListener('click', function() {
  let roomName = roomInput.value.trim();
  if (roomName !== '') {
    socket.emit('createRoom', roomName);
    roomInput.value = '';
  }
});

// Socket event handlers
socket.on('loginSuccess', function(data) {
  myUsername = data.username;
  myPrivateKey = data.privateKey;
  currentUserDisplay.textContent = myUsername;

  authSection.classList.add('hidden');
  chatSection.classList.remove('hidden');

  // Reset error messages
  loginError.textContent = '';
  registerError.textContent = '';
});

socket.on('loginError', function(error) {
  loginError.textContent = error;
});

socket.on('registerSuccess', function() {
  registerError.textContent = 'Registration successful! You can now login.';
  // Switch to login form
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

socket.on('registerError', function(error) {
  registerError.textContent = error;
});

socket.on('updateFriends', function(friends) {
  friendsList.innerHTML = '';

  if (friends.length === 0) {
    friendsList.innerHTML = '<p class="empty-list">No friends yet. Add some friends to start chatting!</p>';
    return;
  }

  friends.forEach(friend => {
    const friendElement = document.createElement('div');
    friendElement.className = 'user_card';
    friendElement.innerHTML = `
      <div class="pic"></div>
      <span>${friend}</span>
    `;
    friendElement.addEventListener('click', function() {
      openChat(friend);
    });
    friendsList.appendChild(friendElement);
  });
});

socket.on('updateFriendRequests', function(requests) {
  friendRequestsList.innerHTML = '';

  if (requests.length === 0) {
    friendRequestsList.innerHTML = '<p class="empty-list">No pending friend requests</p>';
    return;
  }

  requests.forEach(request => {
    const requestElement = document.createElement('div');
    requestElement.className = 'friend-request';
    requestElement.innerHTML = `
      <div class="user_card">
        <div class="pic"></div>
        <span>${request.from}</span>
      </div>
      <div class="request-actions">
        <button class="accept-btn">Accept</button>
        <button class="reject-btn">Reject</button>
      </div>
    `;

    // Add event listeners for accept/reject buttons
    const acceptBtn = requestElement.querySelector('.accept-btn');
    const rejectBtn = requestElement.querySelector('.reject-btn');

    acceptBtn.addEventListener('click', function() {
      socket.emit('respondToFriendRequest', {
        from: request.from,
        response: 'accept'
      });
    });

    rejectBtn.addEventListener('click', function() {
      socket.emit('respondToFriendRequest', {
        from: request.from,
        response: 'reject'
      });
    });

    friendRequestsList.appendChild(requestElement);
  });
});

socket.on('searchResults', function(users) {
  searchResultsList.innerHTML = '';

  if (users.length === 0) {
    searchResultsList.innerHTML = '<p class="empty-list">No users found</p>';
    return;
  }

  users.forEach(user => {
    if (user === myUsername) return; // Skip current user

    const userElement = document.createElement('div');
    userElement.className = 'search-result';
    userElement.innerHTML = `
      <div class="user_card">
        <div class="pic"></div>
        <span>${user}</span>
      </div>
      <button class="add-friend-btn">Add Friend</button>
    `;

    // Add event listener for add friend button
    const addFriendBtn = userElement.querySelector('.add-friend-btn');
    addFriendBtn.addEventListener('click', function() {
      socket.emit('sendFriendRequest', user);
      addFriendBtn.textContent = 'Request Sent';
      addFriendBtn.disabled = true;
    });

    searchResultsList.appendChild(userElement);
  });
});

socket.on('privateMessage', function(data) {
  console.log('Received private message:', data);

  // If chat with sender is not open, open it
  if (currentChatRecipient !== data.sender) {
    openChat(data.sender);
  } else {
    // Display the message if chat is already open
    // Make sure the message content is valid
    if (data.message !== undefined && data.message !== null) {
      displayMessage(data.sender, data.message, false, data.id || '');
    } else {
      console.error('Received invalid message from', data.sender);
    }
  }
});

socket.on('chatHistory', function(data) {
  // Clear chat display
  chatDisplay.innerHTML = '';

  console.log('Received chat history:', data.messages);

  if (!data.messages || data.messages.length === 0) {
    chatDisplay.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
    return;
  }

  // Display chat history
  data.messages.forEach(msg => {
    // Skip messages with no content
    if (!msg.content || msg.content.trim() === '') {
      console.warn(`Skipping empty message from ${msg.sender}`);
      return;
    }

    const isFromMe = msg.sender === myUsername;
    const displayName = isFromMe ? 'You' : msg.sender;

    console.log(`Displaying message from ${displayName}: ${msg.content}`);

    // Add message ID as data attribute for potential future reference
    const messageId = msg.id || '';
    displayMessage(displayName, msg.content, isFromMe, messageId);
  });

  // Scroll to bottom
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

// Legacy event handlers for backward compatibility
socket.on("setPrivateKey", function(privateKey) {
  myPrivateKey = privateKey;
  console.log("Private key received and set");
});

socket.on("updateChat", function (username, data) {
  if (username === "INFO" || username === "ERROR") {
    console.log(`Displaying ${username.toLowerCase()}`);
    const className = username === "INFO" ? "announcement" : "error";
    chatDisplay.innerHTML += `<div class="${className}"><span>${data}</span></div>`;
  } else {
    console.log("Displaying user message");
    displayMessage(username, data, username === myUsername);
  }
});

socket.on("updateUsers", function (usernames) {
  userlist.innerHTML = "";
  console.log("usernames returned from server", usernames);
  for (var user in usernames) {
    userlist.innerHTML += `<div class="user_card">
                              <div class="pic"></div>
                              <span>${user}</span>
                            </div>`;
  }
});

socket.on("updateRooms", function (rooms, newRoom) {
  roomlist.innerHTML = "";

  for (var index in rooms) {
    const roomName = rooms[index].name;
    const roomCreator = rooms[index].creator;

    roomlist.innerHTML += `<div class="room_card" id="${roomName}"
                                onclick="changeRoom('${roomName}')">
                                <div class="room_item_content">
                                    <div class="pic"></div>
                                    <div class="roomInfo">
                                    <span class="room_name">#${roomName}</span>
                                    <span class="room_author">${roomCreator}</span>
                                    </div>
                                </div>
                            </div>`;
  }

  // Make sure the current room exists before trying to add the class
  const currentRoomElement = document.getElementById(currentRoom);
  if (currentRoomElement) {
    currentRoomElement.classList.add("active_item");
  }
});

// Helper function to open chat with a user
function openChat(username) {
  currentChatRecipient = username;
  chatRecipient.textContent = username;

  // Show chat container, hide no-chat message
  noChatSelected.classList.add('hidden');
  chatContainer.classList.remove('hidden');

  // Load chat history
  socket.emit('getChatHistory', username);
}

// Helper function to display a message in the chat
function displayMessage(sender, message, isFromMe, messageId = '') {
  // Make sure message is not undefined or null
  if (message === undefined || message === null) {
    console.error('Attempted to display undefined or null message from', sender);
    message = '[Message could not be displayed]';
  }

  // Sanitize the message to prevent XSS
  const sanitizedMessage = String(message)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  console.log(`Rendering message from ${sender}: ${sanitizedMessage}`);

  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `message_holder ${isFromMe ? 'me' : ''}`;
  if (messageId) {
    messageElement.setAttribute('data-message-id', messageId);
  }

  // Add delete button only for messages sent by the current user
  const deleteButton = isFromMe ?
    `<button class="delete-message-btn" onclick="deleteMessage('${messageId}')">
      <i class="fas fa-trash"></i>
    </button>` : '';

  messageElement.innerHTML = `
    <div class="pic">${sender.charAt(0).toUpperCase()}</div>
    <div class="message_box">
      <div class="message">
        <div class="message_header">
          <span class="message_name">${sender}</span>
          ${deleteButton}
        </div>
        <span class="message_text">${sanitizedMessage}</span>
      </div>
    </div>
  `;

  // Append to chat display
  chatDisplay.appendChild(messageElement);

  // Scroll to bottom
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Function to delete a message
function deleteMessage(messageId) {
  if (!messageId) {
    console.error('Cannot delete message: No message ID provided');
    return;
  }

  // Confirm deletion
  if (confirm('Are you sure you want to delete this message?')) {
    console.log(`Deleting message with ID: ${messageId}`);

    // Send delete request to server
    socket.emit('deleteMessage', {
      messageId: messageId,
      recipient: currentChatRecipient
    });
  }
}

// Legacy function for backward compatibility
function changeRoom(room) {
  if (room != currentRoom) {
    socket.emit("updateRooms", room);
    const currentRoomElement = document.getElementById(currentRoom);
    if (currentRoomElement) {
      currentRoomElement.classList.remove("active_item");
    }
    currentRoom = room;
    const newRoomElement = document.getElementById(currentRoom);
    if (newRoomElement) {
      newRoomElement.classList.add("active_item");
    }
  }
}
