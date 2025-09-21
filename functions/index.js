const admin = require('firebase-admin')

// Initialize Firebase Admin
admin.initializeApp()

const { setAdminClaim, getAdminStatus, listAdmins } = require('./adminManagement')
const { startAnnualUpdate, getWorkflowStatus } = require('./annualUpdateWorkflow')
// Import all functions from separate modules
const { validateEmail } = require('./auth')
const { sendUpdateEmailsToSelected } = require('./email')
const { validateUpdateToken, processParentUpdate, processParentOptOut } = require('./parentUpdate')
const { healthCheck } = require('./utils')

// Export all functions
exports.validateEmail = validateEmail
exports.startAnnualUpdate = startAnnualUpdate
exports.getWorkflowStatus = getWorkflowStatus
exports.sendUpdateEmailsToSelected = sendUpdateEmailsToSelected
exports.validateUpdateToken = validateUpdateToken
exports.processParentUpdate = processParentUpdate
exports.processParentOptOut = processParentOptOut
exports.setAdminClaim = setAdminClaim
exports.getAdminStatus = getAdminStatus
exports.listAdmins = listAdmins
exports.healthCheck = healthCheck
