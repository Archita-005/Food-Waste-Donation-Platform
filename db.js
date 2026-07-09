import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DONATIONS_FILE = path.join(DATA_DIR, 'donations.json');

// Ensure database files exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(DONATIONS_FILE)) {
    // Initial mock data
    const initialDonations = [
      {
        id: "d1",
        title: "Paneer Biryani & Curry",
        description: "Freshly prepared Paneer Biryani and vegetable curry left over from a corporate lunch event. Hygienically packed in disposable containers.",
        servings: 15,
        category: "Cooked Food",
        status: "available",
        expiryTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        donorName: "Royal Spice Catering",
        donorId: "donor_mock_1",
        donorPhone: "+1 (555) 123-4567",
        pickupAddress: "456 Corporate Park, Block B, 3rd Floor",
        imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80",
        createdAt: new Date().toISOString(),
        claimedBy: null,
        claimedAt: null
      },
      {
        id: "d2",
        title: "Assorted Sourdough & Croissants",
        description: "Freshly baked artisan bread and croissants from this morning. Perfect for distribution to local shelters.",
        servings: 25,
        category: "Bakery",
        status: "available",
        expiryTime: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
        donorName: "Le Croissant Bakery",
        donorId: "donor_mock_2",
        donorPhone: "+1 (555) 987-6543",
        pickupAddress: "12 Baker Street, Downtown",
        imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
        createdAt: new Date().toISOString(),
        claimedBy: null,
        claimedAt: null
      },
      {
        id: "d3",
        title: "Organic Apples and Vegetables",
        description: "Slightly bruised but perfectly edible and fresh organic apples, carrots, and lettuce. Packed in crates.",
        servings: 30,
        category: "Fruits & Veg",
        status: "available",
        expiryTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
        donorName: "Fresh & Green Supermarket",
        donorId: "donor_mock_3",
        donorPhone: "+1 (555) 246-8101",
        pickupAddress: "789 Market Ave, Row 4",
        imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff163e2c?w=600&auto=format&fit=crop&q=80",
        createdAt: new Date().toISOString(),
        claimedBy: null,
        claimedAt: null
      },
      {
        id: "d4",
        title: "Mixed Sandwiches & Fruit Cups",
        description: "Freshly assembled club sandwiches, vegetarian wraps, and seasonal fruit cups from our breakfast buffet.",
        servings: 12,
        category: "Cooked Food",
        status: "claimed",
        expiryTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // expired / claimed earlier
        donorName: "Apex Hotel Lounge",
        donorId: "donor_mock_4",
        donorPhone: "+1 (555) 369-2580",
        pickupAddress: "101 Grand Boulevard, Lobby Level",
        imageUrl: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        claimedBy: "recipient_mock_1",
        claimedByName: "Hope NGO Shelter",
        claimedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      }
    ];
    fs.writeFileSync(DONATIONS_FILE, JSON.stringify(initialDonations, null, 2));
  }
}

// Initialise database paths
initDb();

function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

export const db = {
  // Users APIs
  getUsers: () => readJsonFile(USERS_FILE),
  saveUsers: (users) => writeJsonFile(USERS_FILE, users),
  createUser: (user) => {
    const users = readJsonFile(USERS_FILE);
    users.push(user);
    writeJsonFile(USERS_FILE, users);
    return user;
  },
  findUserByEmail: (email) => {
    const users = readJsonFile(USERS_FILE);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById: (id) => {
    const users = readJsonFile(USERS_FILE);
    return users.find(u => u.id === id);
  },

  // Donations APIs
  getDonations: () => {
    // Check and update expired listings status automatically on query
    const donations = readJsonFile(DONATIONS_FILE);
    let changed = false;
    const now = new Date();
    
    donations.forEach(donation => {
      if (donation.status === 'available' && new Date(donation.expiryTime) < now) {
        donation.status = 'expired';
        changed = true;
      }
    });

    if (changed) {
      writeJsonFile(DONATIONS_FILE, donations);
    }
    return donations;
  },
  saveDonations: (donations) => writeJsonFile(DONATIONS_FILE, donations),
  createDonation: (donation) => {
    const donations = readJsonFile(DONATIONS_FILE);
    donations.push(donation);
    writeJsonFile(DONATIONS_FILE, donations);
    return donation;
  },
  updateDonation: (id, updates) => {
    const donations = readJsonFile(DONATIONS_FILE);
    const index = donations.findIndex(d => d.id === id);
    if (index !== -1) {
      donations[index] = { ...donations[index], ...updates };
      writeJsonFile(DONATIONS_FILE, donations);
      return donations[index];
    }
    return null;
  }
};
