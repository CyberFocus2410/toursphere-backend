const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://cyberfocus2410:India100@backenddata.cojhwuc.mongodb.net/?retryWrites=true&w=majority&appName=backenddata'; 
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Secret key for JWT
const JWT_SECRET = 'df5acf76c585fe0b798280150da2bf38b505516172cbdd5445fc2e5eb7562576'; 

// --- User Model and Authentication ---

// Define the User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' } // 'user' or 'admin'
});
const User = mongoose.model('User', userSchema);

// User Registration Endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Username already exists' });
    }
});

// User Login Endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Login Endpoint (Unique)
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const adminUser = await User.findOne({ username, role: 'admin' });
        if (!adminUser) {
            return res.status(400).json({ error: 'Invalid admin credentials' });
        }
        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid admin credentials' });
        }
        const token = jwt.sign({ id: adminUser._id, role: adminUser.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Admin login successful', token });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


// --- Admin and User Role-Based Access ---

// Middleware to protect routes
const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Middleware to protect admin routes
const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    next();
};


// --- Trip and Booking Data Models ---

// Trip Schema
const tripSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    modeOfTransport: { type: String, required: true },
    fare: Number,
    distance: Number,
    duration: String,
    timestamp: { type: Date, default: Date.now }
});
const Trip = mongoose.model('Trip', tripSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    provider: { type: String, required: true },
    status: { type: String, default: 'pending' },
    details: Object
});
const Booking = mongoose.model('Booking', bookingSchema);

// --- Core API Endpoints ---

// Create a new trip (protected)
app.post('/api/trips', authMiddleware, async (req, res) => {
    try {
        const { origin, destination, modeOfTransport } = req.body;
        const newTrip = new Trip({
            userId: req.user.id,
            origin,
            destination,
            modeOfTransport
        });
        await newTrip.save();
        res.status(201).json({ message: 'Trip created successfully', tripId: newTrip._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create trip' });
    }
});

// Update a trip with data (protected)
app.post('/api/trips/:tripId/data', authMiddleware, async (req, res) => {
    try {
        const { tripId } = req.params;
        const { fare, distance, duration } = req.body;
        await Trip.findByIdAndUpdate(tripId, { fare, distance, duration });
        res.status(200).json({ message: 'Trip data updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update trip data' });
    }
});

// Search for cabs (protected)
app.get('/api/bookings/cabs', authMiddleware, async (req, res) => {
    try {
        // Here you would make API calls to Ola, Uber, and Rapido
        // For now, this is a placeholder
        const olaData = { provider: 'Ola', fare: 250, time: '15 min', url: 'https://ola.com/book' };
        const uberData = { provider: 'Uber', fare: 220, time: '12 min', url: 'https://uber.com/book' };
        const rapidoData = { provider: 'Rapido', fare: 180, time: '20 min', url: 'https://rapido.com/book' };

        // Combine and sort the data (e.g., by fare or time)
        const sortedResults = [rapidoData, uberData, olaData]; // Example sorting

        res.json({ results: sortedResults });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch cab options' });
    }
});

// Search for trains, flights, and metros (placeholders)
app.get('/api/bookings/trains', authMiddleware, async (req, res) => {
    // Implement API calls to Indian Railways API
    res.json({ message: 'Train search functionality coming soon' });
});

app.get('/api/bookings/flights', authMiddleware, async (req, res) => {
    // Implement API calls to flight booking APIs
    res.json({ message: 'Flight search functionality coming soon' });
});

app.get('/api/bookings/metros', authMiddleware, async (req, res) => {
    // Implement API calls to metro APIs
    res.json({ message: 'Metro search functionality coming soon' });
});


// Admin API to get all trip data (protected by adminMiddleware)
app.get('/api/admin/data/reports', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const totalTrips = await Trip.countDocuments();
        const tripsByMode = await Trip.aggregate([
            { $group: { _id: '$modeOfTransport', count: { $sum: 1 } } }
        ]);

        res.json({
            totalTrips,
            tripsByMode,
            message: 'Additional data aggregation and reports can be added here.'
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin data' });
    }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
