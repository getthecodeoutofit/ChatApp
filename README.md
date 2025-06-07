# ChatterBox - Personal Chat Application

A feature-rich, secure chat application built with Node.js, Socket.IO, and MongoDB. ChatterBox allows users to communicate in real-time with end-to-end encryption, user authentication, and multiple chat rooms.

<img src="/public/chat-app.png" />

Inspired from -  https://github.com/rajmasha/multi-room-chat-app.git

## Features

### Core Functionality
- **Real-time Communication**: Instant messaging using WebSockets via Socket.IO
- **Multi-room Support**: Join existing rooms or create your own custom chat rooms
- **User Authentication**: Secure registration and login system
- **Persistent Data**: All messages, users, and rooms stored in MongoDB
- **Responsive Design**: Modern UI that works on desktop and mobile devices

### Security Features
- **End-to-End Encryption**: All messages are encrypted using private keys
- **Password Protection**: User passwords are securely hashed using bcrypt
- **Secure Communication**: Messages are encrypted during transmission and storage

### Social Features
- **Friend System**: Add friends to your contacts list
- **Direct Messaging**: Private conversations between users
- **Friend Requests**: Send and receive friend requests
- **User Search**: Find other users on the platform

### User Experience
- **Message History**: View previous messages when joining a room
- **Notifications**: Get notified when users join or leave rooms
- **Message Management**: Delete your sent messages
- **Online Status**: See which users are currently active

## Technology Stack

- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.IO
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Custom auth with bcrypt password hashing
- **Encryption**: CryptoJS for message encryption
- **Frontend**: HTML, CSS, JavaScript
- **UI Framework**: Custom CSS with FontAwesome icons

## Installation

### Prerequisites
- Node.js (v12 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm (usually comes with Node.js)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/getthecodeoutofit/ChatApp.git
   cd chatterbox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=mongodb://localhost:27017/chatterbox
   ENCRYPTION_SECRET=your_secret_encryption_key
   ```

   - `MONGODB_URI`: Your MongoDB connection string
   - `ENCRYPTION_SECRET`: A secret key used for message encryption

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Usage Guide

### Registration and Login
1. Open the application in your browser
2. Click "Register" to create a new account
3. Enter a unique username and password
4. After registration, log in with your credentials

### Chatting in Rooms
1. After logging in, you'll be automatically joined to the "global" room
2. View available rooms in the right sidebar
3. Click on any room to join it
4. Type your message in the input field at the bottom and press Enter or click the send button

### Creating a New Room
1. In the right sidebar, enter a room name in the "Create new room" input field
2. Click the "+" button to create the room
3. The new room will appear in the rooms list and you'll be automatically joined

### Adding Friends
1. Click on the "Find Users" tab in the left sidebar
2. Search for users by username
3. Click "Add Friend" next to a user to send a friend request

### Direct Messaging
1. Click on the "Friends" tab in the left sidebar
2. Click on a friend's name to start a private conversation
3. Type your message and send it - only your friend will receive it

### Managing Friend Requests
1. Click on the "Requests" tab to see incoming friend requests
2. Accept or reject requests as desired

### Logging Out
1. Click the "Logout" button in your profile section
2. You'll be returned to the login screen

## Security Information

### Encryption Process
- Each user is assigned a unique private key upon registration
- Messages are encrypted using a combination of the sender's private key and a conversation-specific key
- Room messages use a room-specific encryption key
- Direct messages use a unique key derived from both users' identifiers
- All encryption is handled automatically - users see plain text in the UI

### Data Storage
- User passwords are never stored in plain text - only securely hashed versions
- Messages are stored in both encrypted and plain text forms in the database
- Private keys are stored securely and never exposed in the client-side code

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running if using a local installation
- Check your internet connection
- Verify the server is running (should show "Listening to port 5000" in console)

### Authentication Problems
- Make sure you're using the correct username and password
- If you forgot your password, you'll need to create a new account (password recovery not implemented)

### Message Delivery Issues
- Ensure you're connected to the internet
- Check if the server is running
- Try refreshing the page to reestablish the connection

## License

NONE
