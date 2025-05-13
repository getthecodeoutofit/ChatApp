const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require('./config/db');
const User = require('./models/User');
const Message = require('./models/Message');
const Room = require('./models/Room');
const PrivateMessage = require('./models/PrivateMessage');
const { generatePrivateKey, encryptMessage, decryptMessage } = require('./utils/encryption');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
let dbConnection;
(async () => {
  try {
    dbConnection = await connectDB();
    if (dbConnection) {
      console.log('MongoDB connection established successfully');
      // Initialize database with default data
      await initializeRooms();
    }
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
  }
})();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// In-memory cache for active users
var activeUsers = {};

// Default rooms to use if database is not available
const defaultRooms = [
  { name: "global", creator: "Anonymous" },
  { name: "chess", creator: "Anonymous" },
];

// In-memory fallback for rooms if database is not available
let roomsCache = [...defaultRooms];

// Helper function to find a socket by username
function findSocketByUsername(username) {
  const sockets = io.sockets.sockets;
  for (const [_, socket] of sockets) {
    if (socket.username === username) {
      return socket;
    }
  }
  return null;
}

// Helper function to update friends list for a socket
async function updateFriendsList(socket) {
  try {
    if (!socket || !socket.username || !dbConnection) return;

    const user = await User.findOne({ username: socket.username });
    if (!user) return;

    socket.emit('updateFriends', user.friends);
  } catch (error) {
    console.error('Error updating friends list:', error);
  }
}

// Helper function to update friend requests for a socket
async function updateFriendRequests(socket) {
  try {
    if (!socket || !socket.username || !dbConnection) return;

    const user = await User.findOne({ username: socket.username });
    if (!user) return;

    socket.emit('updateFriendRequests', user.friendRequests);
  } catch (error) {
    console.error('Error updating friend requests:', error);
  }
}

// Helper function to update active users for all sockets
async function updateActiveUsers(socket) {
  try {
    let userList = {};

    if (dbConnection) {
      // Get active users from database
      const allUsers = await User.find({
        lastActive: { $gte: new Date(Date.now() - 3600000) }
      }).select('username -_id');

      allUsers.forEach(user => {
        userList[user.username] = user.username;
      });
    } else {
      // Use in-memory cache
      Object.keys(activeUsers).forEach(key => {
        userList[key] = key;
      });
    }

    // Send to specific socket or broadcast to all
    if (socket) {
      socket.emit('updateUsers', userList);
    } else {
      io.sockets.emit('updateUsers', userList);
    }
  } catch (error) {
    console.error('Error updating active users:', error);
  }
}

// Helper function to update rooms for a socket
async function updateRooms(socket) {
  try {
    let roomsList = [];

    if (dbConnection) {
      // Get rooms from database
      roomsList = await Room.find().select('name creator -_id');
    } else {
      // Use cached rooms
      roomsList = roomsCache;
    }

    // Send to specific socket or broadcast to all
    if (socket) {
      socket.emit('updateRooms', roomsList, socket.currentRoom || 'global');
    } else {
      io.sockets.emit('updateRooms', roomsList, null);
    }
  } catch (error) {
    console.error('Error updating rooms:', error);
  }
}

// Initialize rooms from database
async function initializeRooms() {
  try {
    // Check if default rooms exist, if not create them
    for (const roomData of defaultRooms) {
      try {
        const roomExists = await Room.findOne({ name: roomData.name });
        if (!roomExists) {
          await Room.create({
            name: roomData.name,
            creator: roomData.creator
          });
          console.log(`Default room ${roomData.name} created in database`);
        }
      } catch (err) {
        console.error(`Error checking/creating room ${roomData.name}:`, err.message);
      }
    }

    // Load all rooms from database into cache
    try {
      const allRooms = await Room.find();
      if (allRooms && allRooms.length > 0) {
        roomsCache = allRooms.map(room => ({
          name: room.name,
          creator: room.creator
        }));
        console.log(`Loaded ${roomsCache.length} rooms from database`);
      }
    } catch (err) {
      console.error('Error loading rooms from database:', err.message);
      console.log('Using default rooms instead');
    }
  } catch (error) {
    console.error('Error initializing rooms:', error);
    console.log('Using default rooms instead');
  }
}

// We'll call initializeRooms after successful DB connection

io.on("connection", function (socket) {
  console.log(`New socket connection established.`);

  // Authentication handlers
  socket.on("register", async function(data) {
    try {
      const { username, password } = data;

      if (!dbConnection) {
        return socket.emit("registerError", "Database connection not available");
      }

      // Check if username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return socket.emit("registerError", "Username already exists");
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate private key for encryption
      const privateKey = generatePrivateKey();

      // Create new user
      await User.create({
        username,
        password: hashedPassword,
        privateKey,
        friends: [],
        friendRequests: [],
        sentRequests: []
      });

      console.log(`User ${username} registered successfully`);
      socket.emit("registerSuccess");

    } catch (error) {
      console.error('Error in register:', error);
      socket.emit("registerError", "Registration failed. Please try again.");
    }
  });

  socket.on("login", async function(data) {
    try {
      const { username, password } = data;

      if (!dbConnection) {
        return socket.emit("loginError", "Database connection not available");
      }

      // Find user
      const user = await User.findOne({ username });
      if (!user) {
        return socket.emit("loginError", "Invalid username or password");
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return socket.emit("loginError", "Invalid username or password");
      }

      // Update last active timestamp
      await User.findOneAndUpdate(
        { username },
        { lastActive: Date.now() }
      );

      // Store user info in socket session
      socket.username = username;
      socket.privateKey = user.privateKey;
      socket.authenticated = true;
      socket.currentRoom = "global";
      socket.join("global");

      // Add to active users cache
      activeUsers[username] = {
        username,
        privateKey: user.privateKey
      };

      console.log(`User ${username} logged in successfully`);

      // Send login success with user data
      socket.emit("loginSuccess", {
        username,
        privateKey: user.privateKey
      });

      // Send welcome message
      socket.emit("updateChat", "INFO", "Welcome back! You have joined global room");

      // Update friends list
      updateFriendsList(socket);

      // Update friend requests
      updateFriendRequests(socket);

      // Get active users for legacy support
      updateActiveUsers(socket);

      // Get rooms for legacy support
      updateRooms(socket);

    } catch (error) {
      console.error('Error in login:', error);
      socket.emit("loginError", "Login failed. Please try again.");
    }
  });

  socket.on("logout", function() {
    if (socket.username) {
      console.log(`User ${socket.username} logged out`);

      // Remove from active users
      delete activeUsers[socket.username];

      // Clear socket session
      socket.username = null;
      socket.privateKey = null;
      socket.authenticated = false;

      // Update active users for others
      updateActiveUsers();
    }
  });

  // Friend system handlers
  socket.on("searchUsers", async function(query) {
    try {
      if (!socket.authenticated) {
        return socket.emit("updateChat", "ERROR", "You must be logged in");
      }

      if (!dbConnection) {
        return socket.emit("searchResults", []);
      }

      // Search for users with username containing the query
      const users = await User.find({
        username: { $regex: query, $options: 'i' }
      }).select('username -_id');

      // Extract usernames
      const usernames = users.map(user => user.username);

      socket.emit("searchResults", usernames);

    } catch (error) {
      console.error('Error searching users:', error);
      socket.emit("searchResults", []);
    }
  });

  socket.on("sendFriendRequest", async function(recipient) {
    try {
      if (!socket.authenticated) {
        return socket.emit("updateChat", "ERROR", "You must be logged in");
      }

      if (!dbConnection) {
        return socket.emit("updateChat", "ERROR", "Database connection not available");
      }

      // Check if recipient exists
      const recipientUser = await User.findOne({ username: recipient });
      if (!recipientUser) {
        return socket.emit("updateChat", "ERROR", "User not found");
      }

      // Check if already friends
      if (recipientUser.friends.includes(socket.username)) {
        return socket.emit("updateChat", "ERROR", "You are already friends with this user");
      }

      // Check if request already sent
      const alreadySent = recipientUser.friendRequests.some(req => req.from === socket.username);
      if (alreadySent) {
        return socket.emit("updateChat", "ERROR", "Friend request already sent");
      }

      // Add friend request to recipient
      await User.findOneAndUpdate(
        { username: recipient },
        {
          $push: {
            friendRequests: {
              from: socket.username,
              status: 'pending',
              createdAt: new Date()
            }
          }
        }
      );

      // Add to sent requests for sender
      await User.findOneAndUpdate(
        { username: socket.username },
        {
          $push: {
            sentRequests: {
              to: recipient,
              status: 'pending',
              createdAt: new Date()
            }
          }
        }
      );

      socket.emit("updateChat", "INFO", `Friend request sent to ${recipient}`);

      // Notify recipient if online
      const recipientSocket = findSocketByUsername(recipient);
      if (recipientSocket) {
        updateFriendRequests(recipientSocket);
        recipientSocket.emit("updateChat", "INFO", `${socket.username} sent you a friend request`);
      }

    } catch (error) {
      console.error('Error sending friend request:', error);
      socket.emit("updateChat", "ERROR", "Failed to send friend request");
    }
  });

  socket.on("respondToFriendRequest", async function(data) {
    try {
      const { from, response } = data;

      if (!socket.authenticated) {
        return socket.emit("updateChat", "ERROR", "You must be logged in");
      }

      if (!dbConnection) {
        return socket.emit("updateChat", "ERROR", "Database connection not available");
      }

      if (response === 'accept') {
        // Add to friends list for both users
        await User.findOneAndUpdate(
          { username: socket.username },
          {
            $push: { friends: from },
            $pull: { friendRequests: { from } }
          }
        );

        await User.findOneAndUpdate(
          { username: from },
          {
            $push: { friends: socket.username },
            $pull: { sentRequests: { to: socket.username } }
          }
        );

        socket.emit("updateChat", "INFO", `You are now friends with ${from}`);

        // Update friends list for both users
        updateFriendsList(socket);

        // Notify the other user if online
        const otherSocket = findSocketByUsername(from);
        if (otherSocket) {
          otherSocket.emit("updateChat", "INFO", `${socket.username} accepted your friend request`);
          updateFriendsList(otherSocket);
        }

      } else if (response === 'reject') {
        // Remove friend request
        await User.findOneAndUpdate(
          { username: socket.username },
          { $pull: { friendRequests: { from } } }
        );

        await User.findOneAndUpdate(
          { username: from },
          { $pull: { sentRequests: { to: socket.username } } }
        );

        socket.emit("updateChat", "INFO", `Friend request from ${from} rejected`);
      }

      // Update friend requests list
      updateFriendRequests(socket);

    } catch (error) {
      console.error('Error responding to friend request:', error);
      socket.emit("updateChat", "ERROR", "Failed to process friend request");
    }
  });

  // Message deletion handler
  socket.on("deleteMessage", async function(data) {
    try {
      const { messageId, recipient } = data;

      if (!socket.authenticated) {
        return socket.emit("deleteError", { message: "You must be logged in to delete messages" });
      }

      console.log(`Attempting to delete message with ID: ${messageId} by user: ${socket.username}`);

      if (!dbConnection) {
        return socket.emit("deleteError", { message: "Database connection not available" });
      }

      // Find the message to verify ownership
      const message = await PrivateMessage.findById(messageId);

      if (!message) {
        return socket.emit("deleteError", { message: "Message not found" });
      }

      // Verify that the user is the sender of the message
      if (message.sender !== socket.username) {
        return socket.emit("deleteError", { message: "You can only delete your own messages" });
      }

      // Mark the message as deleted (soft delete)
      // We'll keep the message in the database but update its content
      await PrivateMessage.findByIdAndUpdate(messageId, {
        content: "[Message deleted]",
        plaintext: "[Message deleted]"
      });

      console.log(`Message ${messageId} deleted by ${socket.username}`);

      // Notify the sender of successful deletion
      socket.emit("messageDeleted", {
        messageId: messageId,
        success: true
      });

      // Notify the recipient if they're online
      const recipientSocket = findSocketByUsername(recipient);
      if (recipientSocket) {
        recipientSocket.emit("messageDeleted", {
          messageId: messageId,
          sender: socket.username,
          success: true
        });
      }

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit("deleteError", { message: "Failed to delete message" });
    }
  });

  // Private messaging handlers
  socket.on("sendPrivateMessage", async function(data) {
    try {
      const { recipient, message } = data;

      if (!socket.authenticated) {
        return socket.emit("updateChat", "ERROR", "You must be logged in");
      }

      // Check if recipient exists and is a friend
      if (dbConnection) {
        const user = await User.findOne({ username: socket.username });
        if (!user.friends.includes(recipient)) {
          return socket.emit("updateChat", "ERROR", "You can only send messages to friends");
        }
      }

      console.log(`Sending message from ${socket.username} to ${recipient}: ${message}`);

      // Encrypt the message using conversation key
      const encryptedMessage = encryptMessage(
        message,
        socket.privateKey,
        socket.username,
        recipient
      );
      console.log(`Message encrypted: ${encryptedMessage.substring(0, 20)}...`);

      let savedMessage = null;

      // Store in database if connected
      if (dbConnection) {
        try {
          savedMessage = await PrivateMessage.create({
            sender: socket.username,
            recipient: recipient,
            content: encryptedMessage,
            plaintext: message, // Store the original message
            encrypted: true
          });
          console.log(`Message saved to database with ID: ${savedMessage._id}`);

          // Verify the message was saved correctly
          const verifyMessage = await PrivateMessage.findById(savedMessage._id);
          console.log(`Verification - Message in DB: ${verifyMessage.content.substring(0, 20)}...`);

          // Try to decrypt the message to verify it works
          const decryptTest = decryptMessage(
            verifyMessage.content,
            socket.privateKey,
            socket.username,
            recipient
          );
          console.log(`Decryption test result: ${decryptTest}`);
        } catch (dbError) {
          console.error('Error storing private message:', dbError);
        }
      }

      // Send to recipient if online
      const recipientSocket = findSocketByUsername(recipient);
      if (recipientSocket) {
        console.log(`Recipient ${recipient} is online, sending message directly`);
        recipientSocket.emit("privateMessage", {
          sender: socket.username,
          message: message,
          id: savedMessage ? savedMessage._id : null
        });
      } else {
        console.log(`Recipient ${recipient} is offline, message will be retrieved from DB later`);
      }

      // Also send confirmation back to sender
      socket.emit("messageSent", {
        recipient: recipient,
        message: message,
        timestamp: new Date(),
        id: savedMessage ? savedMessage._id : null
      });

    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit("updateChat", "ERROR", "Failed to send message");
    }
  });

  socket.on("getChatHistory", async function(username) {
    try {
      if (!socket.authenticated) {
        return socket.emit("updateChat", "ERROR", "You must be logged in");
      }

      if (!dbConnection) {
        return socket.emit("chatHistory", { messages: [] });
      }

      console.log(`Getting chat history between ${socket.username} and ${username}`);

      // Get messages between the two users
      const messages = await PrivateMessage.find({
        $or: [
          { sender: socket.username, recipient: username },
          { sender: username, recipient: socket.username }
        ]
      }).sort({ timestamp: 1 }).limit(50);

      console.log(`Found ${messages.length} messages between ${socket.username} and ${username}`);

      if (messages.length === 0) {
        return socket.emit("chatHistory", { messages: [] });
      }

      // Log a sample message to debug
      if (messages.length > 0) {
        const sampleMsg = messages[0];
        console.log(`Sample message - ID: ${sampleMsg._id}, Sender: ${sampleMsg.sender}, Content: ${sampleMsg.content.substring(0, 30)}...`);
      }

      // Use plaintext messages instead of trying to decrypt
      const decryptedMessages = messages.map(msg => {
        let content;

        // Check if the message has a plaintext field (for newer messages)
        if (msg.plaintext) {
          console.log(`Using plaintext for message ID: ${msg._id}`);
          content = msg.plaintext;
        } else {
          // For older messages, try to decrypt
          try {
            if (msg.encrypted) {
              console.log(`Attempting to decrypt legacy message from ${msg.sender}, ID: ${msg._id}`);

              // Try conversation key for decryption
              content = decryptMessage(
                msg.content,
                socket.privateKey,
                msg.sender,
                msg.recipient
              );

              // If decryption fails, use a placeholder
              if (!content || content === '[Encrypted Message]' || content === '[Decryption Failed]' || content === '[Invalid Message]') {
                console.log(`Using fallback for message ID: ${msg._id}`);
                content = "[Message from " + msg.sender + "]";
              }
            } else {
              content = msg.content;
            }
          } catch (error) {
            console.error(`Error with message ID: ${msg._id}`, error);
            content = "[Message from " + msg.sender + "]";
          }
        }

        // Log the message for debugging
        console.log(`Message from ${msg.sender}: ${content}`);

        return {
          sender: msg.sender,
          content: content,
          timestamp: msg.timestamp,
          id: msg._id.toString()
        };
      });

      socket.emit("chatHistory", { messages: decryptedMessages });

    } catch (error) {
      console.error('Error getting chat history:', error);
      socket.emit("chatHistory", { messages: [] });
    }
  });

  // Legacy handlers for backward compatibility
  socket.on("createUser", async function (username) {
    try {
      let privateKey;

      // Check if database is connected
      if (dbConnection) {
        try {
          // Check if user exists in database
          let user = await User.findOne({ username });

          // If user doesn't exist, create a new one with a private key
          if (!user) {
            privateKey = generatePrivateKey();
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("defaultPassword", salt);

            user = await User.create({
              username,
              password: hashedPassword,
              privateKey
            });
            console.log(`User ${username} created in database with private key`);
          } else {
            privateKey = user.privateKey;
          }

          // Update user's last active timestamp
          await User.findOneAndUpdate(
            { username },
            { lastActive: Date.now() }
          );
        } catch (dbError) {
          console.error('Database error in createUser:', dbError);
          // Generate a temporary private key if database fails
          privateKey = generatePrivateKey();
        }
      } else {
        // No database connection, generate a temporary private key
        privateKey = generatePrivateKey();
        console.log(`User ${username} created with temporary private key (no database)`);
      }

      // Store user info in socket session
      socket.username = username;
      socket.privateKey = privateKey;
      socket.authenticated = true;
      socket.currentRoom = "global";
      socket.join("global");

      // Add to active users cache
      activeUsers[username] = {
        username,
        privateKey
      };

      console.log(`User ${username} connected to server successfully.`);

      // Send private key to client for encryption/decryption
      socket.emit("setPrivateKey", privateKey);

      // Send welcome message
      socket.emit("updateChat", "INFO", "You have joined global room");
      socket.broadcast
        .to("global")
        .emit("updateChat", "INFO", username + " has joined global room");

      // Update active users
      updateActiveUsers(socket);

      // Update rooms
      updateRooms(socket);

    } catch (error) {
      console.error('Error in createUser:', error);
      socket.emit("updateChat", "ERROR", "Error creating user. Please try again.");
    }
  });

  socket.on("sendMessage", async function (data) {
    try {
      if (!socket.username || !socket.currentRoom) return;

      console.log(`Sending room message from ${socket.username} in ${socket.currentRoom}: ${data}`);

      // Encrypt the message with room-specific key
      const roomKey = `room_${socket.currentRoom}`;
      const encryptedMessage = encryptMessage(data, socket.privateKey, socket.username, roomKey);
      console.log(`Room message encrypted: ${encryptedMessage.substring(0, 20)}...`);

      // Store message in database if connected
      if (dbConnection) {
        try {
          const savedMessage = await Message.create({
            sender: socket.username,
            room: socket.currentRoom,
            content: encryptedMessage,
            plaintext: data, // Store the original message
            encrypted: true
          });
          console.log(`Room message saved to database with ID: ${savedMessage._id}`);
        } catch (dbError) {
          console.error('Error storing message in database:', dbError);
          // Continue without storing in database
        }
      }

      // Send only the plain text message to all clients in the room
      // No need to send the encrypted version for display
      io.sockets.to(socket.currentRoom).emit(
        "updateChat",
        socket.username,
        data  // Only send the plain text
      );
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit("updateChat", "ERROR", "Error sending message. Please try again.");
    }
  });

  socket.on("createRoom", async function (room) {
    try {
      if (room != null && socket.username) {
        // Check if room already exists in cache
        const roomExistsInCache = roomsCache.some(r => r.name === room);
        if (roomExistsInCache) {
          socket.emit("updateChat", "ERROR", `Room ${room} already exists.`);
          return;
        }

        // Create new room
        const newRoom = { name: room, creator: socket.username };

        // Add to cache
        roomsCache.push(newRoom);

        // Store in database if connected
        if (dbConnection) {
          try {
            // Double-check if room exists in database
            const roomExists = await Room.findOne({ name: room });
            if (!roomExists) {
              await Room.create(newRoom);
            }

            // Get all rooms from database
            const allRooms = await Room.find().select('name creator -_id');
            io.sockets.emit("updateRooms", allRooms, null);
          } catch (dbError) {
            console.error('Error with database in createRoom:', dbError);
            // Fall back to using cache
            io.sockets.emit("updateRooms", roomsCache, null);
          }
        } else {
          // No database, use cache
          io.sockets.emit("updateRooms", roomsCache, null);
        }
      }
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit("updateChat", "ERROR", "Error creating room. Please try again.");
    }
  });

  socket.on("updateRooms", async function (room) {
    try {
      if (!socket.username) return;

      // Leave current room
      socket.broadcast
        .to(socket.currentRoom)
        .emit("updateChat", "INFO", socket.username + " left room");
      socket.leave(socket.currentRoom);

      // Join new room
      socket.currentRoom = room;
      socket.join(room);

      // Send notifications
      socket.emit("updateChat", "INFO", "You have joined " + room + " room");
      socket.broadcast
        .to(room)
        .emit(
          "updateChat",
          "INFO",
          socket.username + " has joined " + room + " room"
        );

      // Load previous messages for this room if database is connected
      if (dbConnection) {
        try {
          const previousMessages = await Message.find({
            room: room
          }).sort({ timestamp: -1 }).limit(20);

          console.log(`Found ${previousMessages.length} previous messages in room ${room}`);

          // Send previous messages to the user
          if (previousMessages.length > 0) {
            // Reverse to show oldest first
            previousMessages.reverse().forEach(msg => {
              // Use plaintext if available, otherwise try to decrypt
              let messageContent;

              try {
                // Check if the message has a plaintext field (for newer messages)
                if (msg.plaintext) {
                  console.log(`Using plaintext for room message ID: ${msg._id}`);
                  messageContent = msg.plaintext;
                } else if (msg.encrypted) {
                  console.log(`Attempting to decrypt legacy room message from ${msg.sender}, ID: ${msg._id}`);

                  // Try room-specific key for decryption
                  const roomKey = `room_${room}`;
                  messageContent = decryptMessage(
                    msg.content,
                    socket.privateKey,
                    msg.sender,
                    roomKey
                  );

                  // If decryption fails, use a placeholder
                  if (!messageContent || messageContent === '[Encrypted Message]' ||
                      messageContent === '[Decryption Failed]' || messageContent === '[Invalid Message]') {
                    console.log(`Using fallback for room message ID: ${msg._id}`);
                    messageContent = "[Message from " + msg.sender + "]";
                  }
                } else {
                  messageContent = msg.content;
                }

                console.log(`Room message from ${msg.sender}: ${messageContent}`);

                // Only send the message content to display
                socket.emit("updateChat", msg.sender, messageContent);
              } catch (error) {
                console.error('Error decrypting room message:', error);
                // Send a placeholder if decryption fails
                socket.emit("updateChat", msg.sender, "[Encrypted Message]");
              }
            });
          }
        } catch (dbError) {
          console.error('Error loading previous messages:', dbError);
          // Continue without previous messages
        }
      }
    } catch (error) {
      console.error('Error updating room:', error);
      socket.emit("updateChat", "ERROR", "Error joining room. Please try again.");
    }
  });

  socket.on("disconnect", async function () {
    try {
      if (!socket.username) return;

      console.log(`User ${socket.username} disconnected from server.`);

      // Update user's last active timestamp in database if connected
      if (dbConnection) {
        try {
          await User.findOneAndUpdate(
            { username: socket.username },
            { lastActive: Date.now() }
          );
        } catch (dbError) {
          console.error('Error updating user last active time:', dbError);
        }
      }

      // Remove from active users cache
      delete activeUsers[socket.username];

      // Get active users
      let userList = {};

      if (dbConnection) {
        try {
          // Try to get users from database
          const allUsers = await User.find({ lastActive: { $gte: new Date(Date.now() - 3600000) } })
            .select('username -_id');
          allUsers.forEach(user => {
            userList[user.username] = user.username;
          });
        } catch (dbError) {
          console.error('Error fetching users from database:', dbError);
          // Fall back to in-memory users
          Object.keys(activeUsers).forEach(key => {
            userList[key] = key;
          });
        }
      } else {
        // Use in-memory cache if no database
        Object.keys(activeUsers).forEach(key => {
          userList[key] = key;
        });
      }

      io.sockets.emit("updateUsers", userList);

      // Notify all users about disconnection
      socket.broadcast.emit(
        "updateChat",
        "INFO",
        socket.username + " has disconnected"
      );
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });
});

server.listen(5000,'0.0.0.0', function () {
  console.log("Listening to port 5000.");
});
