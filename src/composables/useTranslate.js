import { useI18n } from 'vue-banana-i18n'

/**
 * Translation function for script code: const $i18n = useTranslate()
 * Templates don't need it, the i18n plugin provides $i18n globally.
 */
export function useTranslate () {
  const bananaI18n = useI18n()
  return (key, ...params) => bananaI18n.i18n(key, ...params)
}
