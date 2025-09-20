const functions = require('firebase-functions/v1')
const { FUNCTIONS_REGION } = require('./config')

/**
 * Simple health check endpoint
 */
exports.healthCheck = functions.region(FUNCTIONS_REGION).https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})
