const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import all functions from separate modules
const { validateEmail } = require('./auth');
const { startAnnualUpdate, getWorkflowStatus } = require('./workflow');
const { sendUpdateEmails } = require('./email');
const { validateUpdateToken, processParentUpdate } = require('./parentUpdate');
const { healthCheck } = require('./utils');

// Export all functions
exports.validateEmail = validateEmail;
exports.startAnnualUpdate = startAnnualUpdate;
exports.getWorkflowStatus = getWorkflowStatus;
exports.sendUpdateEmails = sendUpdateEmails;
exports.validateUpdateToken = validateUpdateToken;
exports.processParentUpdate = processParentUpdate;
exports.healthCheck = healthCheck;