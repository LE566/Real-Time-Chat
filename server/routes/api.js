const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Auth Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', auth, authController.getUsers);

// Chat Routes
router.get('/messages/:room', auth, chatController.getMessages);
router.get('/private-messages/:userId/:otherUserId', auth, chatController.getPrivateMessages);
router.get('/last-messages/:userId', auth, chatController.getLastMessages);
router.post('/upload', auth, chatController.uploadImage);

module.exports = router;
