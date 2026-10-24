const { initializeApp } = require('firebase-admin/app')
const { setGlobalOptions } = require('firebase-functions/v2')

// Initialize Firebase Admin
initializeApp()

// Cap instances per function so a flood of requests is throttled instead of
// scaling the bill. Set before the modules below define their functions.
setGlobalOptions({ maxInstances: 10 })

const { deleteOrphanedParentAccount, getParentAccountStatuses } = require('./accounts')
// Import all functions from separate modules
const { restrictSignUpToParents, validateEmailV2 } = require('./auth')
const { updateCommitteeMembersV2 } = require('./committees')
const { sendParentUpdateEmail } = require('./email')
const { validateUpdateTokenV2, processParentUpdateV2, processParentOptOutV2 } = require('./parentUpdate')
const { healthCheckV2 } = require('./utils')

// Export all functions
exports.validateEmailV2 = validateEmailV2
exports.restrictSignUpToParents = restrictSignUpToParents
exports.sendParentUpdateEmail = sendParentUpdateEmail
exports.getParentAccountStatuses = getParentAccountStatuses
exports.deleteOrphanedParentAccount = deleteOrphanedParentAccount
exports.validateUpdateTokenV2 = validateUpdateTokenV2
exports.processParentUpdateV2 = processParentUpdateV2
exports.processParentOptOutV2 = processParentOptOutV2
exports.healthCheckV2 = healthCheckV2
exports.updateCommitteeMembersV2 = updateCommitteeMembersV2
