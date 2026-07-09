import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from './models/User.js';
import Donation from './models/Donation.js';
import dns from 'dns';
import nodemailer from 'nodemailer';
import Otp from './models/Otp.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

// Nodemailer Transporter Config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

// Helper: Send OTP via Email
async function sendOTPEmail(email, otpCode) {
  const mailOptions = {
    from: `"ShareMeal Platform" <${process.env.SMTP_USER || 'no-reply@sharemeal.org'}>`,
    to: email,
    subject: 'ShareMeal Verification Code (OTP)',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0d9488; margin: 0;">ShareMeal Platform</h2>
          <p style="color: #64748b; margin: 5px 0 0 0;">Zero Food Waste, More Community Care</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p>Hello,</p>
        <p>You have requested a verification code (OTP) for your action on ShareMeal. Please use the following code to complete your verification:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 2.2rem; font-weight: 800; color: #0d9488; letter-spacing: 6px; padding: 10px 20px; border-radius: 8px; background-color: #f1f5f9; border: 1px dashed #cbd5e1;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #ef4444; font-weight: 600;">This OTP is valid for 5 minutes only. Do not share this code with anyone.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    `
  };

  try {
    if (!process.env.SMTP_USER) {
      console.log(`===================================================================`);
      console.log(`[OTP SERVICE - DEVELOPMENT FALLBACK]`);
      console.log(`To: ${email}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log(`Reason: SMTP credentials not set in backend/.env file.`);
      console.log(`===================================================================`);
      return true;
    }
    await transporter.sendMail(mailOptions);
    console.log(`[OTP SERVICE] Sent OTP successfully to ${email} (OTP: ${otpCode})`);
    return true;
  } catch (error) {
    console.error(`[OTP SERVICE ERROR] Failed to send email via SMTP:`, error.message);
    console.log(`===================================================================`);
    console.log(`[OTP SERVICE - FAILOVER FALLBACK]`);
    console.log(`To: ${email}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`Error Detail: ${error.message}`);
    console.log(`===================================================================`);
    return true;
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sharemeal-jwt-secret-key-12345';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sharemeal';

// Middlewares
app.use(cors());
app.use(express.json());

// Graceful Database Connection Setup
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(`MongoDB Connected successfully to: ${MONGO_URI}`);
    seedMockData();
  })
  .catch(err => {
    console.log(`===================================================================`);
    console.log(`  WARNING: MongoDB connection failed!`);
    console.log(`  Error detail: ${err.message}`);
    console.log(`  To start MongoDB locally, run: "mongod" in your command line.`);
    console.log(`  We will continue running the backend, but database requests will fail.`);
    console.log(`===================================================================`);
  });

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
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// Seed Initial Database Mock Data (Run if collections are empty)
async function seedMockData() {
  try {
    const userCount = await User.countDocuments();
    let mockDonorId = new mongoose.Types.ObjectId();

    if (userCount === 0) {
      // Seed a default donor and recipient so references work
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      const seedDonor = await User.create({
        _id: mockDonorId,
        name: 'Royal Spice Catering Owner',
        email: 'royal@spice.com',
        password: hashedPassword,
        role: 'donor',
        phone: '+1 (555) 123-4567',
        organization: 'Royal Spice Catering'
      });
      console.log('Seed database: Created mock donor user.');
    }

    // Seed default admin if not exists
    const adminExists = await User.findOne({ email: 'admin@sharemeal.org' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'System Admin Manager',
        email: 'admin@sharemeal.org',
        password: hashedPassword,
        role: 'admin',
        phone: '+1 (555) 999-0000',
        organization: 'ShareMeal Global Administration'
      });
      console.log('Seed database: Created Admin User (admin@sharemeal.org / admin123).');
    }

    const donationCount = await Donation.countDocuments();
    if (donationCount === 0) {
      const now = Date.now();
      const initialDonations = [
        {
          title: "Paneer Biryani & Curry",
          description: "Freshly prepared Paneer Biryani and vegetable curry left over from a corporate lunch event. Hygienically packed in disposable containers.",
          servings: 15,
          category: "Cooked Food",
          status: "available",
          expiryTime: new Date(now + 4 * 60 * 60 * 1000), // 4 hours from now
          donorName: "Royal Spice Catering",
          donorId: mockDonorId,
          donorPhone: "+1 (555) 123-4567",
          pickupAddress: "456 Corporate Park, Block B, 3rd Floor",
          imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
          latitude: 40.730610,  // NY coordinates area
          longitude: -73.935242,
          deliveryNeeded: false,
          deliveryStatus: "none"
        },
        {
          title: "Assorted Sourdough & Croissants",
          description: "Freshly baked artisan bread and croissants from this morning. Perfect for distribution to local shelters.",
          servings: 25,
          category: "Bakery",
          status: "available",
          expiryTime: new Date(now + 18 * 60 * 60 * 1000), // 18 hours from now
          donorName: "Le Croissant Bakery",
          donorId: mockDonorId,
          donorPhone: "+1 (555) 987-6543",
          pickupAddress: "12 Baker Street, Downtown",
          imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
          latitude: 40.758896,
          longitude: -73.985130,
          deliveryNeeded: false,
          deliveryStatus: "none"
        },
        {
          title: "Organic Apples and Vegetables",
          description: "Slightly bruised but perfectly edible and fresh organic apples, carrots, and lettuce. Packed in crates.",
          servings: 30,
          category: "Fruits & Veg",
          status: "available",
          expiryTime: new Date(now + 48 * 60 * 60 * 1000), // 2 days from now
          donorName: "Fresh & Green Supermarket",
          donorId: mockDonorId,
          donorPhone: "+1 (555) 246-8101",
          pickupAddress: "789 Market Ave, Row 4",
          imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=600&auto=format&fit=crop&q=80",
          latitude: 40.7128,
          longitude: -74.0060,
          deliveryNeeded: false,
          deliveryStatus: "none"
        }
      ];

      await Donation.create(initialDonations);
      console.log('Seed database: Created initial mock food listings.');
    }
  } catch (err) {
    console.error('Seeding error:', err.message);
  }
}

// --- AUTHENTICATION ROUTES ---

// Send OTP Code
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    // Generate random 6-digit number
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTP codes for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    // Store in DB
    await Otp.create({
      email: email.toLowerCase(),
      code: otpCode
    });

    // Send email
    await sendOTPEmail(email.toLowerCase(), otpCode);

    res.json({ message: 'Verification OTP code sent successfully!' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Server error sending verification code.' });
  }
});

// Register User (with OTP Verification)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, organization, otp } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    if (!otp) {
      return res.status(400).json({ error: 'Email verification OTP code is required.' });
    }

    if (!['donor', 'recipient', 'volunteer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be donor, recipient, volunteer, or admin.' });
    }

    // Verify OTP first
    const otpRecord = await Otp.findOne({ email: email.toLowerCase(), code: otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP verification code.' });
    }

    // Delete the OTP since it is verified
    await Otp.deleteOne({ _id: otpRecord._id });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone: phone || '',
      organization: organization || ''
    });

    // Create Token
    const token = jwt.sign({ id: newUser._id, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
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

// Login User (Supports Password OR passwordless OTP login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!password && !otp) {
      return res.status(400).json({ error: 'Either password or verification OTP is required to login.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'No account registered with this email address.' });
    }

    if (otp) {
      // Login via OTP
      const otpRecord = await Otp.findOne({ email: email.toLowerCase(), code: otp });
      if (!otpRecord) {
        return res.status(400).json({ error: 'Invalid or expired OTP code.' });
      }

      // Delete the verified OTP
      await Otp.deleteOne({ _id: otpRecord._id });
    } else {
      // Login via Password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid password.' });
      }
    }

    // Create Token
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user._id,
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
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      organization: user.organization
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching profile.' });
  }
});

// --- DONATION ROUTES ---

// Get All Active/Claimed/Expired Donations
app.get('/api/donations', async (req, res) => {
  try {
    // Automatically flag expired listings on read query
    const now = new Date();
    await Donation.updateMany(
      { status: 'available', expiryTime: { $lt: now } },
      { $set: { status: 'expired' } }
    );

    const { status, category, search } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { donorName: regex },
        { pickupAddress: regex }
      ];
    }

    let donations = await Donation.find(query).sort({ createdAt: -1 });

    // Custom sort: Available first, then Claimed, then Expired (unless sorting is specific)
    if (!status) {
      const order = { 'available': 0, 'claimed': 1, 'expired': 2 };
      donations.sort((a, b) => order[a.status] - order[b.status]);
    }

    res.json(donations);
  } catch (error) {
    console.error('Fetch donations error:', error);
    res.status(500).json({ error: 'Server error fetching listings.' });
  }
});

// Create a Donation (Donors Only)
app.post('/api/donations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ error: 'Only donors can list surplus food.' });
    }

    const { title, description, servings, category, expiryHours, pickupAddress, imageUrl, donorPhone, latitude, longitude } = req.body;

    if (!title || !description || !servings || !category || !expiryHours || !pickupAddress) {
      return res.status(400).json({ error: 'All fields (title, description, servings, category, expiryHours, pickupAddress) are required.' });
    }

    const donorUser = await User.findById(req.user.id);
    
    // Category images maps
    const foodCategoryImages = {
      'cooked food': 'https://images.unsplash.com/photo-1545247181-516773cae76d?w=600&auto=format&fit=crop&q=80',
      'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
      'fruits & veg': 'https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=600&auto=format&fit=crop&q=80',
      'groceries': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'
    };
    const defaultImg = foodCategoryImages[category.toLowerCase()] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80';

    // Spread coordinates around Manhattan area so Leaflet places pins nicely
    const latBase = 40.7128;
    const lngBase = -74.0060;
    const offsetLat = (Math.random() - 0.5) * 0.1;
    const offsetLng = (Math.random() - 0.5) * 0.1;

    const newDonation = await Donation.create({
      title,
      description,
      servings: parseInt(servings, 10),
      category,
      expiryTime: new Date(Date.now() + parseFloat(expiryHours) * 60 * 60 * 1000),
      donorName: donorUser ? (donorUser.organization || donorUser.name) : req.user.name,
      donorId: req.user.id,
      donorPhone: donorPhone || (donorUser ? donorUser.phone : ''),
      pickupAddress,
      imageUrl: imageUrl || defaultImg,
      latitude: latitude ? parseFloat(latitude) : latBase + offsetLat,
      longitude: longitude ? parseFloat(longitude) : lngBase + offsetLng
    });

    res.status(201).json(newDonation);
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ error: 'Server error saving food listing.' });
  }
});

// Claim a Donation (Recipients Only)
app.post('/api/donations/:id/claim', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'recipient') {
      return res.status(403).json({ error: 'Only recipient NGOs can claim food.' });
    }

    const { deliveryNeeded } = req.body;
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ error: `This food is already ${donation.status}.` });
    }

    const recipientUser = await User.findById(req.user.id);
    
    donation.status = 'claimed';
    donation.claimedBy = req.user.id;
    donation.claimedByName = recipientUser ? (recipientUser.organization || recipientUser.name) : req.user.name;
    donation.claimedAt = new Date();
    
    if (deliveryNeeded) {
      donation.deliveryNeeded = true;
      donation.deliveryStatus = 'pending_volunteer';
    } else {
      donation.deliveryNeeded = false;
      donation.deliveryStatus = 'none';
    }

    await donation.save();
    res.json(donation);
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Server error processing claim.' });
  }
});

// Request Delivery Support (Recipients can request delivery after claiming)
app.post('/api/donations/:id/request-delivery', authenticateToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Listing not found.' });
    }

    if (donation.claimedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the claiming recipient can request delivery.' });
    }

    donation.deliveryNeeded = true;
    donation.deliveryStatus = 'pending_volunteer';
    await donation.save();

    res.json(donation);
  } catch (error) {
    res.status(500).json({ error: 'Server error requesting delivery.' });
  }
});

// Get User's Created Donations (Donors)
app.get('/api/donations/my-donations', authenticateToken, async (req, res) => {
  try {
    const listings = await Donation.find({ donorId: req.user.id }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching your listings.' });
  }
});

// Get User's Claimed Donations (Recipients)
app.get('/api/donations/my-claims', authenticateToken, async (req, res) => {
  try {
    const claims = await Donation.find({ claimedBy: req.user.id }).sort({ claimedAt: -1 });
    res.json(claims);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching your claims.' });
  }
});


// --- VOLUNTEER LOGISTICS ENDPOINTS ---

// Fetch Active Deliveries (Need Volunteers or In Transit)
app.get('/api/deliveries', authenticateToken, async (req, res) => {
  try {
    let query = { deliveryNeeded: true };
    const { status } = req.query; // 'pending' or 'mine'

    if (status === 'pending') {
      query.deliveryStatus = 'pending_volunteer';
    } else if (status === 'mine') {
      query.volunteerId = req.user.id;
    }

    const deliveries = await Donation.find(query).sort({ claimedAt: -1 });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching deliveries.' });
  }
});

// Accept Delivery Job (Volunteer)
app.post('/api/donations/:id/accept-delivery', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Only volunteers can accept delivery jobs.' });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Delivery item not found.' });
    }

    if (donation.deliveryStatus !== 'pending_volunteer') {
      return res.status(400).json({ error: 'This delivery job has already been taken.' });
    }

    donation.deliveryStatus = 'in_transit';
    donation.volunteerId = req.user.id;
    donation.volunteerName = req.user.name;
    await donation.save();

    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: 'Server error claiming delivery task.' });
  }
});

// Complete Delivery Job (Volunteer)
app.post('/api/donations/:id/complete-delivery', authenticateToken, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Delivery item not found.' });
    }

    if (donation.volunteerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned volunteer can complete this delivery.' });
    }

    donation.deliveryStatus = 'delivered';
    donation.deliveredAt = new Date();
    await donation.save();

    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: 'Server error completing delivery task.' });
  }
});


// --- STATS ENDPOINT ---
app.get('/api/stats', async (req, res) => {
  try {
    const donations = await Donation.find({});

    const totalListings = donations.length;
    const activeCount = donations.filter(d => d.status === 'available').length;
    const claimedCount = donations.filter(d => d.status === 'claimed').length;
    const expiredCount = donations.filter(d => d.status === 'expired').length;

    let totalServingsDonated = 0;
    let totalServingsClaimed = 0;

    donations.forEach(d => {
      totalServingsDonated += d.servings;
      if (d.status === 'claimed') {
        totalServingsClaimed += d.servings;
      }
    });

    const co2SavedKg = parseFloat((totalServingsClaimed * 0.45).toFixed(1));

    const donorsCount = await User.countDocuments({ role: 'donor' });
    const recipientsCount = await User.countDocuments({ role: 'recipient' });
    const volunteersCount = await User.countDocuments({ role: 'volunteer' });

    // Recent claims for dashboard feed timeline
    const recentClaimsList = await Donation.find({ status: 'claimed' })
      .sort({ claimedAt: -1 })
      .limit(5);

    const recentClaims = recentClaimsList.map(d => ({
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
      donorsCount,
      recipientsCount,
      volunteersCount,
      recentClaims
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Server error generating stats.' });
  }
});

// --- ADMIN MANAGEMENT ROUTES ---

// Get all users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Server error fetching user list.' });
  }
});

// Delete user account
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    const userId = req.params.id;
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }
    await User.findByIdAndDelete(userId);
    res.json({ message: 'User account successfully deleted.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Server error deleting user.' });
  }
});

// Get all donations
app.get('/api/admin/donations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    const donations = await Donation.find({}).sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    console.error('Admin fetch donations error:', error);
    res.status(500).json({ error: 'Server error fetching all listings.' });
  }
});

// Delete donation listing (remove fake listings)
app.delete('/api/admin/donations/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    await Donation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Donation listing deleted successfully.' });
  } catch (error) {
    console.error('Admin delete donation error:', error);
    res.status(500).json({ error: 'Server error deleting donation listing.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  ShareMeal MERN Server running on port ${PORT}`);
  console.log(`==================================================`);
});
