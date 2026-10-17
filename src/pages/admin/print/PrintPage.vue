<template>
  <section
    ref="pageRef"
    :aria-hidden="measure || undefined"
    :class="{
      'print-page': true,
      'no-footer': noFooter,
      'first-page': firstPage,
      'has-overflow': hasOverflow,
      'measure': measure
    }"
  >
    <!-- Optional header slot -->
    <div v-if="$slots.header" class="print-page-header">
      <slot name="header" />
    </div>

    <!-- Main content area - fills remaining space -->
    <div class="print-page-content">
      <slot />
    </div>

    <!-- Manual page footer (replaces @page @bottom-center) -->
    <div v-if="!noFooter && !measure" class="page-footer">
      <span class="page-number-left"><span class="page-number" /></span>
      <span class="footer-center">Le Bottin de L'Étoile filante {{ schoolYear }}</span>
      <span class="page-number-right"><span class="page-number" /></span>
    </div>

    <!-- Optional footer slot -->
    <div v-if="$slots.footer" class="print-page-footer">
      <slot name="footer" />
    </div>
  </section>
</template>

<script setup>
  import { onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'
  import { usePrintPageRegistry } from '@/composables/usePrintPageRegistry'
  import { getCurrentSchoolYear } from '@/utils/schoolYear'

  const props = defineProps({
    // Hide page footer (useful for title/cover pages)
    noFooter: {
      type: Boolean,
      default: false,
    },
    // Mark as first page (automatically prevents page break before)
    firstPage: {
      type: Boolean,
      default: false,
    },
    // Section ID(s) for Table of Contents linking - can be a string or array of strings
    id: {
      type: [String, Array],
      default: null,
    },
    // Off-screen copy used to measure blocks at the real page size (see PrintFlow):
    // not numbered, not printed
    measure: {
      type: Boolean,
      default: false,
    },
  })

  const { registerPage } = usePrintPageRegistry()

  // e.g. "2026 - 2027", for the footer
  const schoolYear = getCurrentSchoolYear().replace('-', ' - ')

  const pageRef = ref(null)
  const hasOverflow = ref(false)

  let unregisterPage = null

  onMounted(() => {
    if (props.measure) return

    // Register this page with the registry once it is in the document
    unregisterPage = registerPage(pageRef.value, props.id)

    // Check for content overflow on screen only
    if (import.meta.env.DEV && pageRef.value) {
      checkOverflow()

      // Re-check on window resize
      window.addEventListener('resize', checkOverflow)
    }
  })

  // Pages of a PrintFlow get new content after measuring
  onUpdated(() => {
    if (import.meta.env.DEV && !props.measure) {
      checkOverflow()
    }
  })

  onBeforeUnmount(() => {
    unregisterPage?.()
    window.removeEventListener('resize', checkOverflow)
  })

  function checkOverflow () {
    if (!pageRef.value) return

    // Check if content height exceeds container height
    const element = pageRef.value
    // Add a small threshold to avoid false positives from rounding/subpixel rendering
    const threshold = 2 // 2 pixels tolerance
    hasOverflow.value = (element.scrollHeight - element.clientHeight) > threshold
  }
</script>

<style scoped>
/*
  Page Component - Represents exactly one printed page

  This component enforces strict page sizing to ensure content
  fits exactly on one printed page. Use this for all print layouts
  where you need precise control over page breaks.
*/

.print-page {
  /*
    Type scale for every print page: components use these roles, never literal sizes.
    One family, Avenir; Didot only for the cover title and Kalam only for class names.
  */
  --print-size-title: 16pt;     /* Section and page titles, letter headers */
  --print-size-subtitle: 13pt;  /* Subsections: h2, committee categories, teams */
  --print-size-heading: 11pt;   /* Entry names: h3, committees, families, classes, contents */
  --print-size-text: 10.5pt;    /* Running text: référentiel, implication, FAQ, notes */
  --print-size-contact: 9.5pt;  /* Names, phones and emails */
  --print-size-detail: 9pt;     /* Job titles, addresses, levels, class lists, parents index */
  --print-size-footer: 8pt;     /* Page footer */

  /* Exact page dimensions: half-letter booklet page (5.5in x 8.5in) */
  width: 5.5in;
  height: 8.5in;

  /* Account for page margins defined in @page rule */
  /* Default margins: 0.5in top/left/right, 0.7in bottom (room for the footer) */
  box-sizing: border-box;
  padding: 0.5in 0.5in 0.7in 0.5in;

  /* Always start a new page when printing */
  page-break-before: always;
  page-break-after: always;
  page-break-inside: avoid;

  /* Prevent content overflow */
  overflow: hidden;

  /* Typography defaults */
  color: black;
  font-family: Avenir, 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--print-size-contact);
  line-height: 1.4;

  /* Flexbox layout for header/content/footer structure */
  display: flex;
  flex-direction: column;

  /* Position relative for absolute footer positioning */
  position: relative;
}

.print-page-header {
  flex-shrink: 0;
}

.print-page-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* The last block's bottom margin is only space: it must not push past the end of the page */
.print-page-content > :deep(:last-child) {
  margin-bottom: 0;
}

.print-page-footer {
  flex-shrink: 0;
}

/* Screen-only: Document viewer styling */
@media screen {
  .print-page {
    /* Document-style presentation */
    margin: 1rem auto;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid #d0d0d0;
    position: relative;
  }

  .print-page.first-page {
    margin-top: 1.4rem;
  }

  /* Overflow indicator - shows when content is clipped */
  .print-page.has-overflow::after {
    content: '⚠️ CONTENT CLIPPED - This page has more content than fits';
    position: absolute;
    bottom: 0.35in;
    left: 0.5in;
    right: 0.5in;
    padding: 0.35rem;
    background: linear-gradient(to bottom, transparent, rgba(244, 67, 54, 0.2) 30%, rgba(244, 67, 54, 0.3));
    border: 2px solid #f44336;
    border-radius: 4px;
    color: #c62828;
    font-weight: bold;
    font-size: var(--print-size-contact);
    text-align: center;
    pointer-events: none;
    z-index: 100;
  }
}

/* Measuring copy: laid out like a page, but off-screen, not counted and not printed */
.print-page.measure {
  position: absolute;
  top: 0;
  left: -10000px;
  visibility: hidden;
  counter-increment: none;
}

@media print {
  .print-page.measure {
    display: none;
  }
}

/* First page should not have page break before */
.print-page.first-page {
  page-break-before: avoid;
}

/* Pages with no footer get extra bottom padding */
.print-page.no-footer {
  padding-bottom: 0.5in;
}

/* Manual page footer */
.page-footer {
  position: absolute;
  bottom: 0.35in;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--print-size-footer);
  color: #000;
  padding: 0 0.5in;
}

.footer-center {
  flex: 1;
  text-align: center;
}

.page-number-left,
.page-number-right {
  flex: 0 0 auto;
  white-space: nowrap;
}

/* Increment counter for each page */
.print-page {
  counter-increment: manual-page;
}

/* Display counter in footer */
.page-number::before {
  content: counter(manual-page);
}

/* Even pages (2, 4, 6...) - page number on LEFT */
.print-page:nth-child(even) .page-number-right {
  display: none;
}

/* Odd pages (1, 3, 5...) - page number on RIGHT */
.print-page:nth-child(odd) .page-number-left {
  display: none;
}

@media print {
  .print-page {
    /* Remove screen-only styling */
    margin: 0;
    box-shadow: none;
    border: 0;

    /* Same padding as screen mode - we control all spacing */
    padding: 0.5in 0.5in 0.7in 0.5in;

    /* Exact page sizing - a fixed height, so percentage heights inside the page resolve as on screen */
    width: 100%;
    height: 8.5in;

    /* Force page breaks */
    page-break-before: always;
    page-break-after: always;
    page-break-inside: avoid;

    /* Keep position relative for footer */
    position: relative;
  }

  .print-page.first-page {
    page-break-before: avoid;
  }

  .print-page.no-footer {
    padding: 0.5in;
  }

  /* Ensure footer is visible and positioned correctly in print */
  .page-footer {
    position: absolute;
    bottom: 0.35in;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.5in;
      font-size: var(--print-size-footer);
    color: #000;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .footer-center {
    flex: 1;
    text-align: center;
  }

  .page-number-left,
  .page-number-right {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  /* Even pages - page number on LEFT */
  .print-page:nth-child(even) .page-number-right {
    display: none;
  }

  /* Odd pages - page number on RIGHT */
  .print-page:nth-child(odd) .page-number-left {
    display: none;
  }
}

/* Centralized heading styles for all print pages */
.print-page :deep(.section-title) {
  font-size: var(--print-size-title);
  font-weight: bold;
  margin: 0 0 0.7rem 0;
  padding: 0.35rem 0;
  border-bottom: 2px solid black;
}

.print-page :deep(h2) {
  font-size: var(--print-size-subtitle);
  font-weight: 600;
  margin: 0.7rem 0 0.35rem 0;
  color: #000;
}

.print-page :deep(h3) {
  font-size: var(--print-size-heading);
  font-weight: 600;
  margin: 0.35rem 0;
  color: #000;
  text-align: center;
}

.print-page :deep(.section-subtitle) {
  font-size: var(--print-size-subtitle);
  font-weight: 600;
  margin: 0 0 0.35rem 0;
  color: #000;
}

.print-page :deep(.committee-title) {
  font-size: var(--print-size-title);
  font-weight: bold;
  margin: 0;
  color: #000;
}

.print-page :deep(.group-title) {
  font-size: var(--print-size-title);
  font-weight: bold;
  margin: 0;
  color: #000;
}

.print-page :deep(.subgroup-title) {
  font-size: var(--print-size-heading);
  font-weight: 600;
  margin: 0 0 0.35rem 0;
  color: #000;
}

.print-page :deep(.committee-category-title) {
  font-size: var(--print-size-subtitle);
  font-weight: 600;
  margin: 1rem 0 0.7rem 0;
  color: #000;
}
</style>
