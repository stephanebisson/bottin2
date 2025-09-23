const { onRequest } = require('firebase-functions/v2/https')
const { FUNCTIONS_REGION } = require('./config')

/**
 * Simple health check endpoint
 */
exports.healthCheckV2 = onRequest({
  region: FUNCTIONS_REGION,
  cors: {
    origin: true,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  },
}, (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })
})