/**
 * Print Pagination Utilities
 *
 * Fills print pages by the real height of their blocks instead of a fixed count per page
 * (see PrintFlow). Blocks are measured in off-screen copies of a first page and of a
 * following page, at the real page size and with the real fonts, then packed in order.
 */

/**
 * Measure the blocks of a measuring page
 * Blocks are the direct children of the page's content area, a flex column, so their
 * margins never collapse: each block takes its margin box.
 * @param {HTMLElement} content - The measuring page's .print-page-content
 * @returns {{ height: number, marginBottom: number, keepWithNext: boolean, breakBefore: boolean }[]} One entry
 *   per block: height includes the margins; headings (and .keep-with-next) stay with the next block,
 *   .break-before starts a new page
 */
export function measureBlocks (content) {
  return [...content.children].map(element => {
    const style = getComputedStyle(element)
    const marginBottom = Number.parseFloat(style.marginBottom)
    return {
      height: Number.parseFloat(style.marginTop) + element.getBoundingClientRect().height + marginBottom,
      marginBottom,
      keepWithNext: element.matches('h1, h2, h3, h4, h5, h6, .keep-with-next'),
      breakBefore: element.matches('.break-before'),
    }
  })
}

/**
 * Pack blocks into pages, in order, as many as fit on each page
 * The last block's bottom margin may run past the end of the page: it is only space.
 * @param {{ height: number, marginBottom?: number, keepWithNext?: boolean, breakBefore?: boolean }[]} blocks - From measureBlocks
 * @param {number} firstPageSpace - Space for blocks on the first page
 * @param {number} pageSpace - Space for blocks on the following pages
 * @returns {number[][]} Block indexes on each page; a block taller than a page gets a page of its own
 */
export function paginateByHeight (blocks, firstPageSpace, pageSpace) {
  const pages = []
  let page = []
  let used = 0
  let space = firstPageSpace

  for (const [index, block] of blocks.entries()) {
    if (page.length > 0 && (block.breakBefore || used + block.height - (block.marginBottom ?? 0) > space)) {
      // Headings at the bottom of the page move with the block that follows them,
      // unless that would leave the page empty
      const carried = []
      while (page.length > 1 && blocks[page.at(-1)].keepWithNext) {
        carried.unshift(page.pop())
      }

      pages.push(page)
      page = carried
      used = carried.reduce((sum, carriedIndex) => sum + blocks[carriedIndex].height, 0)
      space = pageSpace
    }

    page.push(index)
    used += block.height
  }

  if (page.length > 0) {
    pages.push(page)
  }

  return pages
}
