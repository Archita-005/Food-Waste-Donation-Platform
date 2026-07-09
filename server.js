import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'sharemeal-jwt-secret-key-12345';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token.' });
  }
}

// --- AUTHENTICATION ROUTES ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, organization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (role !== 'donor' && role !== 'recipient') {
      return res.status(400).json({ error: 'Role must be either donor or recipient.' });
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || '',
      organization: organization || '',
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);

    // Create Token
    const token = jwt.sign({ id: newUser.id, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        organization: newUser.organization
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Create Token
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        organization: user.organization
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    organization: user.organization
  });
});


// --- DONATION ROUTES ---

// Get All Available/Claimed/Expired Donations
app.get('/api/donations', (req, res) => {
  const donations = db.getDonations();
  const { status, category, search } = req.query;

  let filtered = [...donations];

  if (status) {
    filtered = filtered.filter(d => d.status === status);
  } else {
    // By default, send available first, then claimed, then expired
    filtered.sort((a, b) => {
      const order = { 'available': 0, 'claimed': 1, 'expired': 2 };
      return order[a.status] - order[b.status];
    });
  }

  if (category && category !== 'All') {
    filtered = filtered.filter(d => d.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(d => 
      d.title.toLowerCase().includes(q) || 
      d.description.toLowerCase().includes(q) ||
      d.donorName.toLowerCase().includes(q) ||
      d.pickupAddress.toLowerCase().includes(q)
    );
  }

  res.json(filtered);
});

// Create a Donation (Donors Only)
app.post('/api/donations', authenticateToken, (req, res) => {
  if (req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Only donors can create food listings.' });
  }

  const { title, description, servings, category, expiryHours, pickupAddress, imageUrl, donorPhone } = req.body;

  if (!title || !description || !servings || !category || !expiryHours || !pickupAddress) {
    return res.status(400).json({ error: 'All fields (title, description, servings, category, expiryHours, pickupAddress) are required.' });
  }

  const donorUser = db.findUserById(req.user.id);
  const foodCategoryImages = {
    'cooked food': 'https://images.unsplash.com/photo-1545247181-516773cae76d?w=600&auto=format&fit=crop&q=80',
    'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    'fruits & veg': 'https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=600&auto=format&fit=crop&q=80',
    'groceries': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'
  };

  const defaultImg = foodCategoryImages[category.toLowerCase()] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80';

  const newDonation = {
    id: uuidv4(),
    title,
    description,
    servings: parseInt(servings, 10),
    category,
    status: 'available',
    expiryTime: new Date(Date.now() + parseFloat(expiryHours) * 60 * 60 * 1000).toISOString(),
    donorName: donorUser ? (donorUser.organization || donorUser.name) : req.user.name,
    donorId: req.user.id,
    donorPhone: donorPhone || (donorUser ? donorUser.phone : ''),
    pickupAddress,
    imageUrl: imageUrl || defaultImg,
    createdAt: new Date().toISOString(),
    claimedBy: null,
    claimedAt: null
  };

  db.createDonation(newDonation);
  res.status(201).json(newDonation);
});

// Claim a Donation (Recipients Only)
app.post('/api/donations/:id/claim', authenticateToken, (req, res) => {
  if (req.user.role !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients (NGOs/shelters) can claim food.' });
  }

  const donations = db.getDonations();
  const donation = donations.find(d => d.id === req.params.id);

  if (!donation) {
    return res.status(404).json({ error: 'Food listing not found.' });
  }

  if (donation.status !== 'available') {
    return res.status(400).json({ error: `This food listing is already ${donation.status}.` });
  }

  const recipientUser = db.findUserById(req.user.id);
  const updates = {
    status: 'claimed',
    claimedBy: req.user.id,
    claimedByName: recipientUser ? (recipientUser.organization || recipientUser.name) : req.user.name,
    claimedAt: new Date().toISOString()
  };

  const updated = db.updateDonation(req.params.id, updates);
  res.json(updated);
});

// Get User's Created Donations (Donors)
app.get('/api/donations/my-donations', authenticateToken, (req, res) => {
  if (req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Only donors can fetch their listings.' });
  }

  const donations = db.getDonations();
  const myDonations = donations.filter(d => d.donorId === req.user.id);
  res.json(myDonations);
});

// Get User's Claimed Donations (Recipients)
app.get('/api/donations/my-claims', authenticateToken, (req, res) => {
  if (req.user.role !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can fetch their claims.' });
  }

  const donations = db.getDonations();
  const myClaims = donations.filter(d => d.claimedBy === req.user.id);
  res.json(myClaims);
});


// --- STATS ROUTE ---
app.get('/api/stats', (req, res) => {
  const donations = db.getDonations();
  
  const totalListings = donations.length;
  const activeCount = donations.filter(d => d.status === 'available').length;
  const claimedCount = donations.filter(d => d.status === 'claimed').length;
  const expiredCount = donations.filter(d => d.status === 'expired').length;

  // Calculate total meals / servings claimed/donated
  let totalServingsDonated = 0;
  let totalServingsClaimed = 0;

  donations.forEach(d => {
    totalServingsDonated += d.servings;
    if (d.status === 'claimed') {
      totalServingsClaimed += d.servings;
    }
  });

  // Calculate CO2 saved (simulated: 0.5 kg of CO2 equivalent saved per serving saved from landfill)
  const co2SavedKg = parseFloat((totalServingsClaimed * 0.45).toFixed(1));

  // Count unique donor and recipient NGO registrations
  const users = db.getUsers();
  const donorsCount = users.filter(u => u.role === 'donor').length;
  const recipientsCount = users.filter(u => u.role === 'recipient').length;

  // Recent claims log to display in a timeline
  const recentClaims = donations
    .filter(d => d.status === 'claimed')
    .sort((a, b) => new Date(b.claimedAt) - new Date(a.claimedAt))
    .slice(0, 5)
    .map(d => ({
      title: d.title,
      donorName: d.donorName,
      claimedByName: d.claimedByName,
      servings: d.servings,
      time: d.claimedAt
    }));

  res.json({
    totalListings,
    activeCount,
    claimedCount,
    expiredCount,
    totalServingsDonated,
    totalServingsClaimed,
    co2SavedKg,
    donorsCount: donorsCount + 4, // Including mock accounts
    recipientsCount: recipientsCount + 1,
    recentClaims
  });
});

// Default path redirect or single-page app support
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  ShareMeal Server running on http://localhost:${PORT}`);
  console.log(`==================================================`);
});
