const { initializeApp } = require('firebase-admin/app')

// Initialize Firebase Admin
initializeApp()

const { deleteOrphanedParentAccount, getParentAccountStatuses } = require('./accounts')
const { setAdminClaimV2, getAdminStatusV2, listAdminsV2 } = require('./adminManagement')
// Import all functions from separate modules
const { validateEmailV2 } = require('./auth')
const { updateCommitteeMembersV2 } = require('./committees')
const { sendParentUpdateEmail } = require('./email')
const { validateUpdateTokenV2, processParentUpdateV2, processParentOptOutV2 } = require('./parentUpdate')
const { healthCheckV2 } = require('./utils')

// Export all functions
exports.validateEmailV2 = validateEmailV2
exports.sendParentUpdateEmail = sendParentUpdateEmail
exports.getParentAccountStatuses = getParentAccountStatuses
exports.deleteOrphanedParentAccount = deleteOrphanedParentAccount
exports.validateUpdateTokenV2 = validateUpdateTokenV2
exports.processParentUpdateV2 = processParentUpdateV2
exports.processParentOptOutV2 = processParentOptOutV2
exports.setAdminClaimV2 = setAdminClaimV2
exports.getAdminStatusV2 = getAdminStatusV2
exports.listAdminsV2 = listAdminsV2
exports.healthCheckV2 = healthCheckV2
exports.updateCommitteeMembersV2 = updateCommitteeMembersV2
