const admin = require('firebase-admin')

// Initialize Firebase Admin
admin.initializeApp()

const { setAdminClaim, getAdminStatus, listAdmins } = require('./adminManagement')
const { startAnnualUpdate, getWorkflowStatus } = require('./annualUpdateWorkflow')
// Import all functions from separate modules
const { validateEmail } = require('./auth')
const { sendUpdateEmails, sendUpdateEmailsToSelected } = require('./email')
const { validateUpdateToken, processParentUpdate } = require('./parentUpdate')
const { healthCheck } = require('./utils')

// Export all functions
exports.validateEmail = validateEmail
exports.startAnnualUpdate = startAnnualUpdate
exports.getWorkflowStatus = getWorkflowStatus
exports.sendUpdateEmails = sendUpdateEmails
exports.sendUpdateEmailsToSelected = sendUpdateEmailsToSelected
exports.validateUpdateToken = validateUpdateToken
exports.processParentUpdate = processParentUpdate
exports.setAdminClaim = setAdminClaim
exports.getAdminStatus = getAdminStatus
exports.listAdmins = listAdmins
exports.healthCheck = healthCheck
