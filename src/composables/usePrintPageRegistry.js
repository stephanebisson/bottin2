/**
 * Print Page Registry
 *
 * Tracks mounted PrintPage elements and their section IDs to automatically compute
 * Table of Contents page numbers. A page's number is its position in the document,
 * so pages rendered later (e.g. lists paginated after measuring) are numbered correctly.
 */

import { computed, shallowReactive } from 'vue'

// Mounted pages: { el, sectionIds }; shallow so DOM elements stay unproxied
const pages = shallowReactive([])

// Pages in document order
const orderedPages = computed(() => pages.toSorted((a, b) =>
  a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
))

export function usePrintPageRegistry () {
  /**
   * Register a mounted page with optional section ID(s)
   * @param {HTMLElement} el - The page element
   * @param {string|string[]|null} sectionId - Section identifier(s) for ToC linking
   * @returns {Function} Unregisters the page; call it when the page unmounts
   */
  function registerPage (el, sectionId = null) {
    const entry = { el, sectionIds: sectionId ? [sectionId].flat() : [] }
    pages.push(entry)
    return () => pages.splice(pages.indexOf(entry), 1)
  }

  /**
   * Get the page number for a given section ID
   * @param {string} sectionId - Section identifier
   * @returns {number|null} Page number or null if not found
   */
  function getPageNumber (sectionId) {
    const index = orderedPages.value.findIndex(page => page.sectionIds.includes(sectionId))
    return index === -1 ? null : index + 1
  }

  return {
    registerPage,
    getPageNumber,
  }
}
