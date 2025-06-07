const CryptoJS = require('crypto-js');
const crypto = require('crypto');
require('dotenv').config();


const generatePrivateKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateConversationKey = (user1, user2) => {
  const sortedUsers = [user1, user2].sort().join('_');

  return CryptoJS.SHA256(sortedUsers + process.env.ENCRYPTION_SECRET).toString();
};


const encryptMessage = (message, privateKey, sender = null, recipient = null) => {
  try {
    let encryptionKey;

    if (sender && recipient) {
      encryptionKey = generateConversationKey(sender, recipient);
      console.log(`Using conversation key for ${sender} and ${recipient}`);
    } else {

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


const decryptMessage = (encryptedMessage, privateKey, sender = null, recipient = null) => {
  try {

    console.log(`Attempting to decrypt message...`);


    if (!encryptedMessage || typeof encryptedMessage !== 'string') {
      console.error('Invalid encrypted message:', encryptedMessage);
      return '[Invalid Message]';
    }

    let decrypted = '';
    let decryptionKey;

    if (sender && recipient) {
      decryptionKey = generateConversationKey(sender, recipient);
      console.log(`Trying conversation key for ${sender} and ${recipient}`);

      try {
        decrypted = CryptoJS.AES.decrypt(encryptedMessage, decryptionKey).toString(CryptoJS.enc.Utf8);
      } catch (e) {
        console.log('Conversation key decryption failed, will try private key');
      }
    }

    if (!decrypted) {
      decryptionKey = privateKey + process.env.ENCRYPTION_SECRET;
      console.log('Trying private key for decryption');

      try {
        decrypted = CryptoJS.AES.decrypt(encryptedMessage, decryptionKey).toString(CryptoJS.enc.Utf8);
      } catch (e) {
        console.error('Private key decryption failed:', e);
      }
    }

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
