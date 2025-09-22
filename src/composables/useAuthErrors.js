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
