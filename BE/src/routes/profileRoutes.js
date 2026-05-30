const express = require('express');
const router = express.Router();
const { getProfile, getLeaderboard, unlockTheme } = require('../controllers/profileController');

router.get('/leaderboard', getLeaderboard);
router.get('/:id', getProfile);
router.post('/:id/theme', unlockTheme);

module.exports = router;