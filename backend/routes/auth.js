const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => process.env.JWT_SECRET || 'ignisia_hackathon_secret_123';

const generateToken = (id) => {
    return jwt.sign({ id }, getJwtSecret(), {
        expiresIn: '30d',
    });
};

// ── POST /api/auth/signup ──────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            email,
            password: hashedPassword,
            name: name || 'Faculty Member',
            role: 'faculty',
        });

        const token = generateToken(user._id);

        return res.status(201).json({
            success: true,
            token,
            user: { id: user._id, email: user.email, name: user.name, role: user.role }
        });
    } catch (err) {
        console.error('[POST /api/auth/signup]', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        // Must explicitly select password since it has select: false in schema
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        return res.status(200).json({
            success: true,
            token,
            user: { id: user._id, email: user.email, name: user.name, role: user.role }
        });
    } catch (err) {
        console.error('[POST /api/auth/login]', err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;
