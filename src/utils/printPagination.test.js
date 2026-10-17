import { describe, expect, test } from 'vitest'
import { paginateByHeight } from './printPagination.js'

// Blocks of the given heights; 'h' marks a heading (keeps with next), 'b' a forced page break
function blocks (...specs) {
  return specs.map(spec => {
    const [height, flag] = String(spec).split(/(?=[hb])/)
    return { height: Number(height), keepWithNext: flag === 'h', breakBefore: flag === 'b' }
  })
}

describe('paginateByHeight', () => {
  test('fills each page in order, with less space on the first page', () => {
    expect(paginateByHeight(blocks(30, 30, 30, 30, 30), 70, 100)).toEqual([[0, 1], [2, 3, 4]])
  })

  test('a block that fits exactly stays on the page', () => {
    expect(paginateByHeight(blocks(50, 50, 50), 100, 100)).toEqual([[0, 1], [2]])
  })

  test('a block taller than a page gets a page of its own', () => {
    expect(paginateByHeight(blocks(50, 150, 50), 100, 100)).toEqual([[0], [1], [2]])
  })

  test('blocks of different heights', () => {
    expect(paginateByHeight(blocks(40, 70, 20, 10, 90, 10), 100, 100)).toEqual([[0], [1, 2, 3], [4, 5]])
  })

  test('a heading at the bottom of a page moves to the next page with its block', () => {
    expect(paginateByHeight(blocks(60, '20h', 50), 100, 100)).toEqual([[0], [1, 2]])
  })

  test('consecutive headings move together', () => {
    expect(paginateByHeight(blocks(50, '20h', '20h', 50), 100, 100)).toEqual([[0], [1, 2, 3]])
  })

  test('a heading alone on its page stays rather than leaving the page empty', () => {
    expect(paginateByHeight(blocks('20h', 90), 100, 100)).toEqual([[0], [1]])
  })

  test('a forced break starts a new page even when the block would fit', () => {
    expect(paginateByHeight(blocks(20, 20, '20b', 20), 100, 100)).toEqual([[0, 1], [2, 3]])
  })

  test('a heading before a forced break goes with it', () => {
    expect(paginateByHeight(blocks(20, '20h', '20b'), 100, 100)).toEqual([[0], [1, 2]])
  })

  test('the last block\'s bottom margin may run past the end of the page', () => {
    const withMargin = [{ height: 60, marginBottom: 10 }, { height: 50, marginBottom: 10 }]
    expect(paginateByHeight(withMargin, 100, 100)).toEqual([[0, 1]])
    expect(paginateByHeight(withMargin, 99, 100)).toEqual([[0], [1]])
  })

  test('no blocks, no pages', () => {
    expect(paginateByHeight([], 100, 100)).toEqual([])
  })
})
