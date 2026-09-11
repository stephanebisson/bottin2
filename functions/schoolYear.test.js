import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getCurrentSchoolYear } from './schoolYear.js'

describe('getCurrentSchoolYear', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Use T12:00:00 (noon local time) to avoid date-only UTC parsing shifting the day in UTC-offset timezones
  describe('school year in progress (Jan–Jun)', () => {
    test.each([
      ['January 1', '2026-01-01T12:00:00', '2025-2026'],
      ['March 15', '2026-03-15T12:00:00', '2025-2026'],
      ['June 15', '2026-06-15T12:00:00', '2025-2026'],
      ['June 30 — last day before flip', '2026-06-30T12:00:00', '2025-2026'],
    ])('%s → %s', (_, dateStr, expected) => {
      vi.setSystemTime(new Date(dateStr))
      expect(getCurrentSchoolYear()).toBe(expected)
    })
  })

  describe('new school year (Jul–Dec)', () => {
    test.each([
      ['July 1 — first day of new year', '2026-07-01T12:00:00', '2026-2027'],
      ['August 28 — typical start of prep', '2026-08-28T12:00:00', '2026-2027'],
      ['September 1 — school starts', '2026-09-01T12:00:00', '2026-2027'],
      ['December 31', '2026-12-31T12:00:00', '2026-2027'],
    ])('%s → %s', (_, dateStr, expected) => {
      vi.setSystemTime(new Date(dateStr))
      expect(getCurrentSchoolYear()).toBe(expected)
    })
  })

  test('boundary: June 30 → July 1 flip', () => {
    vi.setSystemTime(new Date('2026-06-30T23:59:59'))
    expect(getCurrentSchoolYear()).toBe('2025-2026')

    vi.setSystemTime(new Date('2026-07-01T00:00:00'))
    expect(getCurrentSchoolYear()).toBe('2026-2027')
  })
})
