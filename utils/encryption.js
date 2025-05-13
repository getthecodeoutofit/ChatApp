const CryptoJS = require('crypto-js');
const crypto = require('crypto');
require('dotenv').config();

// Generate a random private key for a user
const generatePrivateKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate a conversation key between two users
const generateConversationKey = (user1, user2) => {
  // Sort usernames to ensure the same key regardless of order
  const sortedUsers = [user1, user2].sort().join('_');
  // Create a deterministic key based on the usernames and the secret
  return CryptoJS.SHA256(sortedUsers + process.env.ENCRYPTION_SECRET).toString();
};

// Encrypt a message using a conversation key
const encryptMessage = (message, privateKey, sender = null, recipient = null) => {
  try {
    let encryptionKey;

    // If sender and recipient are provided, use conversation key
    if (sender && recipient) {
      encryptionKey = generateConversationKey(sender, recipient);
      console.log(`Using conversation key for ${sender} and ${recipient}`);
    } else {
      // Fallback to private key
      encryptionKey = privateKey + process.env.ENCRYPTION_SECRET;
      console.log('Using private key for encryption');
    }

    const encrypted = CryptoJS.AES.encrypt(message, encryptionKey).toString();
    console.log(`Message encrypted successfully: ${encrypted.substring(0, 20)}...`);
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return message; // Return original message if encryption fails
  }
};

// Decrypt a message
const decryptMessage = (encryptedMessage, privateKey, sender = null, recipient = null) => {
  try {
    // Add more detailed logging
    console.log(`Attempting to decrypt message...`);

    // Check if the encrypted message is valid
    if (!encryptedMessage || typeof encryptedMessage !== 'string') {
      console.error('Invalid encrypted message:', encryptedMessage);
      return '[Invalid Message]';
    }

    let decrypted = '';
    let decryptionKey;

    // Try conversation key first if sender and recipient are provided
    if (sender && recipient) {
      decryptionKey = generateConversationKey(sender, recipient);
      console.log(`Trying conversation key for ${sender} and ${recipient}`);

      try {
        decrypted = CryptoJS.AES.decrypt(encryptedMessage, decryptionKey).toString(CryptoJS.enc.Utf8);
      } catch (e) {
        console.log('Conversation key decryption failed, will try private key');
      }
    }

    // If conversation key didn't work, try private key
    if (!decrypted) {
      decryptionKey = privateKey + process.env.ENCRYPTION_SECRET;
      console.log('Trying private key for decryption');

      try {
        decrypted = CryptoJS.AES.decrypt(encryptedMessage, decryptionKey).toString(CryptoJS.enc.Utf8);
      } catch (e) {
        console.error('Private key decryption failed:', e);
      }
    }

    // Check if decryption was successful
    if (!decrypted) {
      console.error('Decryption produced empty result');
      return '[Decryption Failed]';
    }

    console.log(`Successfully decrypted message: ${decrypted.substring(0, 20)}${decrypted.length > 20 ? '...' : ''}`);
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Encrypted Message]'; // Return a placeholder if decryption fails
  }
};

module.exports = {
  generatePrivateKey,
  generateConversationKey,
  encryptMessage,
  decryptMessage
};
