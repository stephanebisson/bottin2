import { useI18n } from '@/composables/useI18n'

/**
 * Composable to translate auth error messages
 */
export function useAuthErrors () {
  const { t } = useI18n()

  const translateAuthError = error => {
    // If error is already a translation key (starts with 'auth.'), translate it
    if (typeof error === 'string' && error.startsWith('auth.')) {
      return t(error)
    }

    // Map common auth errors to translation keys
    const errorMap = {
      'Please verify your email address before signing in. Check your inbox for a verification link.': 'auth.checkEmailForVerification',
      'This email address is not authorized to create an account. Only registered parents and staff can create accounts.': 'validation.emailNotAuthorized',
      'No account found with this email address.': 'validation.userNotFound',
      'Incorrect password.': 'validation.wrongPassword',
      'An account with this email already exists.': 'validation.emailAlreadyInUse',
      'Password should be at least 6 characters.': 'validation.weakPassword',
      'Invalid email address.': 'validation.emailInvalid',
      'Too many failed attempts. Please try again later.': 'validation.tooManyRequests',
      'Network error. Please check your connection.': 'validation.networkError',
      'No internet connection. Please check your network and try again.': 'auth.noInternetConnection',
      'Email validation service temporarily unavailable. Please try again in a moment.': 'auth.emailValidationServiceUnavailable',
      'Too many requests. Please wait a moment and try again.': 'auth.tooManyRequests',
      'Server error during email validation. Please try again.': 'auth.serverErrorValidation',
      ' Please check your internet connection and try again.': 'auth.checkInternetConnection',
      ' You may have reached the email sending limit. Please try again in a few hours.': 'auth.emailLimitReached',
      'Your session has expired. Please sign in again to resend verification email.': 'auth.sessionExpiredResendEmail',
    }

    // Check if we have a translation for this error
    if (errorMap[error]) {
      return t(errorMap[error])
    }

    // Return original error if no translation available
    return error
  }

  return {
    translateAuthError,
  }
}
