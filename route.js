const express = require('express')
const router = express.Router();
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const customerRoutes = require('./routes/customerRoutes');
const claimsRoutes = require('./routes/claimRoutes');
const blanketDepositRoutes = require('./routes/blanketDepositRoutes');
const moverRoutes = require('./routes/moverRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');


router.use('/user', userRoutes);
router.use('/customer', customerRoutes);
router.use('/job', jobRoutes);
router.use('/claim', claimsRoutes);
router.use('/deposit', blanketDepositRoutes);
router.use('/mover', moverRoutes);
router.use('/schedule', scheduleRoutes);

module.exports=router