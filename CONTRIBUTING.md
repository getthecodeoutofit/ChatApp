# Contributing to ChatterBox

Thank you for your interest in contributing to ChatterBox! This document provides guidelines and instructions for contributing to this project.

## Getting Started

### Prerequisites

- Node.js (v12 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Git
- npm (usually comes with Node.js)

### Setting Up the Development Environment

1. **Fork the repository**
   Click the "Fork" button at the top right of the repository page.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/chatterbox.git
   cd chatterbox
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   Copy the `.env.example` file to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your MongoDB connection string and encryption secret.

5. **Start the development server**
   ```bash
   npm start
   ```

## Project Structure

- `/config` - Configuration files (database connection)
- `/models` - MongoDB schema definitions
- `/public` - Static assets and client-side code
- `/utils` - Utility functions (encryption, etc.)
- `server.js` - Main application entry point

## Key Components

### Database Models

- **User.js** - User account information, friends, and authentication
- **Message.js** - Room messages with encryption
- **PrivateMessage.js** - Direct messages between users
- **Room.js** - Chat room definitions

### Server Components

- **Socket.IO Events** - Handles real-time communication
- **Authentication** - User registration and login
- **Encryption** - Message encryption/decryption
- **Database Operations** - CRUD operations for users, messages, and rooms

### Client Components

- **app.js** - Client-side JavaScript for the chat application
- **index.html** - Main HTML structure
- **style.css** - Application styling

## Development Workflow

1. **Create a branch for your feature or bugfix**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   Implement your feature or fix the bug.

3. **Test your changes**
   Make sure the application works as expected.

4. **Commit your changes**
   ```bash
   git commit -m "Add feature: your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   Go to the original repository and click "New Pull Request".

## Coding Standards

- Use consistent indentation (2 spaces)
- Follow JavaScript ES6+ conventions
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable and function names

## Feature Ideas for Contributors

- Implement password reset functionality
- Add user profile pictures
- Create a typing indicator
- Add read receipts for messages
- Implement message reactions (emoji responses)
- Add file sharing capabilities
- Create a mobile app version
- Implement voice/video chat

## Testing

Currently, the project doesn't have automated tests. If you'd like to contribute by adding tests, consider:

- Unit tests for utility functions
- Integration tests for API endpoints
- End-to-end tests for user flows

## Questions?

If you have any questions or need help, please open an issue in the repository.

Thank you for contributing to ChatterBox!
