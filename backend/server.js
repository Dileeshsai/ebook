import express from 'express';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import razorpay from 'razorpay';
import cors from 'cors';
import dotenv from 'dotenv';
import User from './models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// CORS setup
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5000'],  // Allow both frontend and backend ports
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

// Razorpay instance
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Register route
app.post('/api/register', async (req, res) => {
    const { name, username, password } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, username, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Add like (save a book to the user's likes)


// Middleware for authentication

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];  // Get token from Authorization header
    if (!token) {
        return res.status(403).send('Token is required');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Check if the error is because the token is expired
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired, please log in again' });
            }

            // Handle other JWT errors
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        
        req.userId = decoded.userId;
        next();
    });
};





// Updated like route
app.post('/api/user/like', authMiddleware, async (req, res) => {
    const { bookId } = req.body;

    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.likedBooks.includes(bookId)) {
            user.likedBooks.push(bookId);
            await user.save();
        }

        res.status(200).json({ message: "Book liked successfully", likedBooks: user.likedBooks });
    } catch (error) {
        console.error("Error liking book:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Updated unlike route
app.post('/api/user/unlike', authMiddleware, async (req, res) => {
    const { bookId } = req.body;

    console.log("Received unlike request for bookId:", bookId);

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            console.error("User not found:", req.userId);
            return res.status(404).json({ message: "User not found" });
        }

        console.log("Before unliking, likedBooks:", user.likedBooks);

        // Ensure type consistency
        user.likedBooks = user.likedBooks.filter(id => id.toString() !== bookId.toString());

        await user.save();

        console.log("After unliking, likedBooks:", user.likedBooks);

        res.status(200).json({ message: "Book unliked successfully", likedBooks: user.likedBooks });
    } catch (error) {
        console.error("Error unliking book:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



app.get('/api/user/likes', authMiddleware, async (req, res) => {
    console.log('Received request to /api/user/likes');  // Log when the route is hit
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ likedBooks: user.likedBooks });
    } catch (error) {
        console.error("Error fetching liked books:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


// Fetch user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
    console.log("Incoming request headers:", req.headers);  // Log the headers to check the token
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            name: user.name,
            username: user.username,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});





// Razorpay subscription route
app.post('/api/subscribe', async (req, res) => {
    const { userId, amount } = req.body;

    try {
        const order = await razorpayInstance.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: `receipt#${Date.now()}`,
            payment_capture: 1
        });

        res.json({ order });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create Razorpay order. Please try again later.' });
    }
});

// After successful payment
// After successful payment
app.post("/api/payment/success", async (req, res) => {
    try {
        const { paymentId, userId } = req.body;

        // Check if paymentId and userId are present
        if (!paymentId || !userId) {
            return res.status(400).json({ message: "Payment ID or User ID is missing" });
        }

        const razorpayApiKey = process.env.RAZORPAY_KEY_ID;
        const razorpayApiSecret = process.env.RAZORPAY_KEY_SECRET;

        // Verify payment details with Razorpay API
        const paymentDetailsResponse = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${razorpayApiKey}:${razorpayApiSecret}`).toString('base64')}`
            }
        });

        if (!paymentDetailsResponse.ok) {
            throw new Error('Failed to fetch payment details');
        }

        const paymentDetails = await paymentDetailsResponse.json();

        // Check if payment was successful
        if (paymentDetails.status === 'captured') {
            // Proceed to update user's subscription status
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Assuming your User model has an `isSubscribed` field
            user.isSubscribed = true;
            await user.save();

            res.status(200).json({ message: "Subscription successful!" });
        } else {
            return res.status(400).json({ message: "Payment not successful" });
        }
    } catch (error) {
        console.error("Payment verification failed:", error);
        res.status(500).json({ message: "Payment verification failed" });
    }
});


app.delete('/api/user/likes/:bookId', authMiddleware, async (req, res) => {
    const { bookId } = req.params;  // Extract the bookId from the URL
    
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Remove the bookId from the likedBooks array
        user.likedBooks = user.likedBooks.filter(id => id.toString() !== bookId);
        await user.save();

        res.status(200).json({ message: "Book removed from favorites", likedBooks: user.likedBooks });
    } catch (error) {
        console.error("Error removing book from favorites:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Server-side: Get user's subscription status (assuming you have a `User` model)
app.get('/api/user/status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);  // Assuming userId is decoded from the JWT token
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return subscription status (or any other data you need)
        return res.json({ isSubscribed: user.isSubscribed || false });
    } catch (error) {
        console.error("Error fetching user status:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
