/**
 * Print Page Registry
 *
 * Tracks PrintPage components and their section IDs to automatically compute
 * Table of Contents page numbers.
 */

import { reactive, readonly } from 'vue'

// Global registry of pages with section IDs
const pageRegistry = reactive({
  pages: [], // Array of { sectionId, pageNumber }
  pageCount: 0,
})

// Map of sectionId -> page number for quick lookup
const sectionPageMap = reactive({})

export function usePrintPageRegistry () {
  /**
   * Register a page with optional section ID(s)
   * @param {string|string[]|null} sectionId - Section identifier(s) for ToC linking
   * @returns {number} The page number assigned to this page
   */
  function registerPage (sectionId = null) {
    pageRegistry.pageCount++
    const pageNumber = pageRegistry.pageCount

    if (sectionId) {
      // Handle multiple section IDs (for pages with multiple sections)
      const sectionIds = Array.isArray(sectionId) ? sectionId : [sectionId]

      for (const id of sectionIds) {
        // Register the page with its section ID
        pageRegistry.pages.push({ sectionId: id, pageNumber })
        // Update the map for quick lookup
        sectionPageMap[id] = pageNumber
      }
    }

    return pageNumber
  }

  /**
   * Get the page number for a given section ID
   * @param {string} sectionId - Section identifier
   * @returns {number|null} Page number or null if not found
   */
  function getPageNumber (sectionId) {
    return sectionPageMap[sectionId] || null
  }

  /**
   * Reset the registry (useful for re-rendering)
   */
  function reset () {
    pageRegistry.pages = []
    pageRegistry.pageCount = 0
    for (const key of Object.keys(sectionPageMap)) {
      delete sectionPageMap[key]
    }
  }

  /**
   * Get all registered pages
   * @returns {Array} Array of { sectionId, pageNumber }
   */
  function getAllPages () {
    return readonly(pageRegistry.pages)
  }

  return {
    registerPage,
    getPageNumber,
    reset,
    getAllPages,
    sectionPageMap: readonly(sectionPageMap),
  }
}
