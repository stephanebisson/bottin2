import { describe, expect, test } from 'vitest'
import { toDirectoryEntry } from './parentDirectory.js'

const parent = {
  first_name: 'Claude',
  last_name: 'Tremblay',
  phone: '5145551234',
  email: 'claude@example.com',
  address: '123 rue Principale',
  city: 'Montréal',
  postal_code: 'H2X 1Y4',
  interests: ['sports'],
  optedOut: false,
  createdAt: '2025-08-01',
  updatedAt: '2026-09-01',
}

describe('toDirectoryEntry', () => {
  test('keeps the contact information of a parent who submitted the update form', () => {
    const entry = toDirectoryEntry({ ...parent, lastUpdated: '2026-09-15' })
    expect(entry).toEqual({ ...parent, lastUpdated: '2026-09-15' })
  })

  test('leaves out the contact information of a parent who never submitted it', () => {
    const entry = toDirectoryEntry(parent)
    for (const field of ['phone', 'email', 'address', 'city', 'postal_code']) {
      expect(entry).not.toHaveProperty(field)
    }
    expect(entry).toEqual({
      first_name: 'Claude',
      last_name: 'Tremblay',
      interests: ['sports'],
      optedOut: false,
      createdAt: '2025-08-01',
      updatedAt: '2026-09-01',
    })
  })

  test('treats a null lastUpdated as not submitted', () => {
    expect(toDirectoryEntry({ ...parent, lastUpdated: null })).not.toHaveProperty('email')
  })

  test('never copies fields it does not know', () => {
    const entry = toDirectoryEntry({ ...parent, lastUpdated: '2026-09-15', notes: 'private' })
    expect(entry).not.toHaveProperty('notes')
  })
})
