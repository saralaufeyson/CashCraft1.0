const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Register user
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create default jars
      const defaultJars = [
        { name: 'Necessities', budget: 0, color: '#FF6B6B' },
        { name: 'Education', budget: 0, color: '#4ECDC4' },
        { name: 'Savings', budget: 0, color: '#45B7D1' },
        { name: 'Play', budget: 0, color: '#96CEB4' },
        { name: 'Long Term', budget: 0, color: '#FFEEAD' },
        { name: 'Give', budget: 0, color: '#D4A5A5' }
      ];

      user = new User({
        name,
        email,
        password,
        jars: defaultJars
      });

      await user.save();
      const token = user.generateAuthToken();

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          jars: user.jars
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login user
router.post('/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').exists().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = user.generateAuthToken();

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          jars: user.jars
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'email', 'password'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ message: 'Invalid updates' });
  }

  try {
    const user = await User.findById(req.user._id);

    updates.forEach(update => user[update] = req.body[update]);
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        jars: user.jars
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user jars
router.get('/jars', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.jars);
  } catch (error) {
    console.error('Error fetching jars:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update jar
router.put('/jars/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const jar = user.jars.id(req.params.id);
    
    if (!jar) {
      return res.status(404).json({ message: 'Jar not found' });
    }

    Object.assign(jar, req.body);
    await user.save();
    
    res.json(jar);
  } catch (error) {
    console.error('Error updating jar:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new jar
router.post('/jars', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.jars.push(req.body);
    await user.save();
    res.status(201).json(user.jars[user.jars.length - 1]);
  } catch (error) {
    console.error('Error creating jar:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;