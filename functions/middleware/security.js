/**
 * Security middleware for Firebase Cloud Functions
 * Provides security headers and HTTPS enforcement
 */

/**
 * Sets comprehensive security headers on HTTP responses
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function (optional for Firebase Functions)
 */
const setSecurityHeaders = (req, res, next) => {
  // Force HTTPS with HSTS (HTTP Strict Transport Security)
  // max-age: 1 year, includeSubDomains: apply to all subdomains, preload: submit to HSTS preload list
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Prevent MIME type sniffing attacks
  res.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking attacks
  res.set('X-Frame-Options', 'DENY')

  // XSS Protection (legacy but still useful for older browsers)
  res.set('X-XSS-Protection', '1; mode=block')

  // Content Security Policy - restrict resource loading
  const csp = [
    'default-src \'self\'',
    'script-src \'self\'',
    'style-src \'self\' \'unsafe-inline\'', // Allow inline styles for frameworks
    'img-src \'self\' data: https:',
    'font-src \'self\' https:',
    'connect-src \'self\' https:',
    'frame-ancestors \'none\'', // Equivalent to X-Frame-Options: DENY
    'base-uri \'self\'',
    'form-action \'self\'',
  ].join('; ')
  res.set('Content-Security-Policy', csp)

  // Referrer Policy - control referrer information
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy (Feature Policy) - disable potentially dangerous features
  const permissions = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()',
  ].join(', ')
  res.set('Permissions-Policy', permissions)

  // Cache control for sensitive responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')

  // Remove potentially revealing server information
  res.removeHeader('X-Powered-By')
  res.removeHeader('Server')

  if (next) {
    next()
  }
}

/**
 * Sets security headers specifically for API responses
 * Less restrictive CSP for API endpoints that return JSON
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function (optional)
 */
const setApiSecurityHeaders = (req, res, next) => {
  // HSTS for HTTPS enforcement
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Basic security headers
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  res.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Cache control for API responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate')

  // Permissions policy
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Remove revealing headers
  res.removeHeader('X-Powered-By')
  res.removeHeader('Server')

  if (next) {
    next()
  }
}

/**
 * Enforces HTTPS for production requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const enforceHttps = (req, res, next) => {
  // Skip HTTPS enforcement in development/emulator
  if (process.env.NODE_ENV === 'development'
    || process.env.FUNCTIONS_EMULATOR === 'true'
    || req.headers['x-forwarded-proto'] === 'https'
    || req.secure) {
    if (next) {
      next()
    }
    return
  }

  // In production, redirect HTTP to HTTPS
  if (req.headers['x-forwarded-proto'] !== 'https') {
    console.warn('HTTPS enforcement: Redirecting HTTP request to HTTPS')
    return res.status(301).redirect(`https://${req.get('host')}${req.originalUrl}`)
  }

  if (next) {
    next()
  }
}

/**
 * Validates request origin against allowed domains
 * @param {Array} allowedOrigins - List of allowed origins
 * @returns {Function} Middleware function
 */
const validateOrigin = (allowedOrigins = []) => {
  return (req, res, next) => {
    const origin = req.headers.origin

    // Allow requests without origin (direct API calls, mobile apps, etc.)
    if (!origin) {
      if (next) {
        next()
      }
      return
    }

    // Check if origin is in allowed list
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      console.warn('Origin validation failed:', {
        origin,
        allowedOrigins,
        userAgent: req.headers['user-agent'],
      })

      return res.status(403).json({
        error: 'Origin not allowed',
        code: 'ORIGIN_NOT_ALLOWED',
      })
    }

    if (next) {
      next()
    }
  }
}

/**
 * Rate limiting middleware (basic implementation)
 * For production, consider using Firebase Extensions or external service
 * @param {Object} options - Rate limiting options
 * @returns {Function} Middleware function
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 60, // Max 60 requests per minute
    keyGenerator = req => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  } = options

  const requests = new Map()

  return (req, res, next) => {
    const key = keyGenerator(req)
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old requests
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart)
      requests.set(key, userRequests)
    } else {
      requests.set(key, [])
    }

    const userRequests = requests.get(key)

    // Check rate limit
    if (userRequests.length >= maxRequests) {
      console.warn('Rate limit exceeded:', {
        key,
        requests: userRequests.length,
        limit: maxRequests,
        windowMs,
      })

      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      })
    }

    // Add current request
    userRequests.push(now)
    requests.set(key, userRequests)

    // Set rate limit headers
    res.set('X-RateLimit-Limit', maxRequests.toString())
    res.set('X-RateLimit-Remaining', (maxRequests - userRequests.length).toString())
    res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString())

    if (next) {
      next()
    }
  }
}

/**
 * Combined security middleware for Firebase Functions
 * @param {Object} options - Security options
 * @returns {Function} Middleware function
 */
const applySecurity = (options = {}) => {
  const {
    enforceHttpsInProd = true,
    useApiHeaders = true,
    allowedOrigins = [],
    enableRateLimit = false,
    rateLimitOptions = {},
  } = options

  return (req, res, next) => {
    // Apply security headers
    if (useApiHeaders) {
      setApiSecurityHeaders(req, res)
    } else {
      setSecurityHeaders(req, res)
    }

    // HTTPS enforcement
    if (enforceHttpsInProd) {
      enforceHttps(req, res, () => {
        // Origin validation
        if (allowedOrigins.length > 0) {
          validateOrigin(allowedOrigins)(req, res, () => {
            // Rate limiting
            if (enableRateLimit) {
              rateLimit(rateLimitOptions)(req, res, next)
            } else if (next) {
              next()
            }
          })
        } else if (enableRateLimit) {
          rateLimit(rateLimitOptions)(req, res, next)
        } else if (next) {
          next()
        }
      })
    } else {
      // Origin validation
      if (allowedOrigins.length > 0) {
        validateOrigin(allowedOrigins)(req, res, () => {
          // Rate limiting
          if (enableRateLimit) {
            rateLimit(rateLimitOptions)(req, res, next)
          } else if (next) {
            next()
          }
        })
      } else if (enableRateLimit) {
        rateLimit(rateLimitOptions)(req, res, next)
      } else if (next) {
        next()
      }
    }
  }
}

module.exports = {
  setSecurityHeaders,
  setApiSecurityHeaders,
  enforceHttps,
  validateOrigin,
  rateLimit,
  applySecurity,
}
