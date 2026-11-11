const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const staffRoutes = require('./staff.routes');
const adminRoutes = require('./admin.routes');
const viewRoutes = require('./view.routes');

// API Routes
router.use('/api/auth', authRoutes);
router.use('/api/customer', customerRoutes);
router.use('/api/staff', staffRoutes);
router.use('/api/admin', adminRoutes);

// View Routes (EJS Pages)
router.use('/', viewRoutes);

module.exports = router;
