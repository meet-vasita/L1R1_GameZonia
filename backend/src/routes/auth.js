const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model('User', UserSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// New route to check admin count and limit status
router.get('/admin-status', async (req, res) => {
  try {
    const adminCount = await User.countDocuments();
    const canAddAdmin = adminCount < 2;
    
    res.json({ 
      adminCount, 
      canAddAdmin,
      maxAdmins: 2,
      exists: adminCount > 0
    });
  } catch (err) {
    console.error('Error checking admin status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check-admin-exists', async (req, res) => {
  try {
    const adminCount = await User.countDocuments();
    res.json({ exists: adminCount > 0 });
  } catch (err) {
    console.error('Error checking admin existence:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/initial-setup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const adminCount = await User.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({ message: 'Admin already exists. Use regular registration.' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    res.status(201).json({ message: 'Initial admin created successfully' });
  } catch (err) {
    console.error('Error in initial setup:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register-public', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Check admin count limit
    const adminCount = await User.countDocuments();
    if (adminCount >= 2) {
      return res.status(400).json({ 
        message: 'Maximum number of admins (2) already exists. Cannot create more admins.',
        adminCount,
        maxAdmins: 2
      });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    const newAdminCount = await User.countDocuments();
    res.status(201).json({ 
      message: 'Admin registered successfully',
      adminCount: newAdminCount,
      canAddMore: newAdminCount < 2
    });
  } catch (err) {
    console.error('Error in public registration:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Check admin count limit
    const adminCount = await User.countDocuments();
    if (adminCount >= 2) {
      return res.status(400).json({ 
        message: 'Maximum number of admins (2) already exists. Cannot create more admins.',
        adminCount,
        maxAdmins: 2
      });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    
    const newAdminCount = await User.countDocuments();
    res.status(201).json({ 
      message: 'Admin registered successfully',
      adminCount: newAdminCount,
      canAddMore: newAdminCount < 2
    });
  } catch (err) {
    console.error('Error in protected registration:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;