const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
const cors = require('cors');

// MongoDB connection 
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'DouneStore';

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dounecompany@gmail.com',
        pass: 'zasa vbpy arko snov'
    }
});

// Store temporary OTP data
const otpStorage = new Map();

// Thêm middleware CORS
router.use(cors());

// Registration endpoint
router.post('/register', async (req, res) => {
    try {
        const { fullname, email, password } = req.body;
        
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP temporarily
        otpStorage.set(email, {
            otp,
            fullname,
            password: await bcrypt.hash(password, 10),
            timestamp: Date.now()
        });

        // Send OTP email
        await transporter.sendMail({
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Xác thực đăng ký tài khoản',
            html: `<p>Mã OTP của bạn là: <strong>${otp}</strong></p>`
        });

        res.json({ success: true, message: 'OTP đã được gửi đến email của bạn' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi đăng ký' });
    }
});

// Verify OTP endpoint
router.post('/verify', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const userData = otpStorage.get(email);

        if (!userData || userData.otp !== otp) {
            return res.status(400).json({ success: false, message: 'OTP không h��p lệ' });
        }

        // Check OTP expiration (15 minutes)
        if (Date.now() - userData.timestamp > 15 * 60 * 1000) {
            otpStorage.delete(email);
            return res.status(400).json({ success: false, message: 'OTP đã hết hạn' });
        }

        // Save user to MongoDB
        const client = await MongoClient.connect(mongoUrl);
        const db = client.db(dbName);
        
        await db.collection('User').insertOne({
            fullname: userData.fullname,
            email: email,
            password: userData.password,
            role: 'Member',
            createdAt: new Date()
        });

        // Clear OTP data
        otpStorage.delete(email);
        
        res.json({ success: true, message: 'Đăng ký thành công' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi xác thực' });
    }
});

module.exports = router;
