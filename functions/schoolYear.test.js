import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { formatUpdateDeadline, getCurrentSchoolYear, getUpdateDeadline, isPastUpdateDeadline } from './schoolYear.js'

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

describe('update deadline', () => {
  test('falls on October 31 of the school year\'s first fall', () => {
    expect(getUpdateDeadline('2026-2027')).toBe('2026-10-31')
  })

  test('is written in French for the emails', () => {
    expect(formatUpdateDeadline('2026-2027')).toBe('31 octobre')
  })

  // Explicit UTC offsets: the deadline ends at midnight Montreal time (UTC-4 in October)
  test.each([
    ['during the update period', '2026-2027', '2026-09-15T12:00:00-04:00', false],
    ['last second of the deadline day', '2026-2027', '2026-10-31T23:59:59-04:00', false],
    ['Oct 31, 10 p.m. in Montreal, already Nov 1 in UTC', '2026-2027', '2026-11-01T02:00:00Z', false],
    ['midnight after the deadline', '2026-2027', '2026-11-01T00:00:00-04:00', true],
    ['link from last school year', '2025-2026', '2026-09-15T12:00:00-04:00', true],
  ])('%s → past: %s', (_, schoolYear, dateStr, expected) => {
    expect(isPastUpdateDeadline(schoolYear, new Date(dateStr))).toBe(expected)
  })
})
