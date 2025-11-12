<template>
  <section
    ref="pageRef"
    :class="{
      'print-page': true,
      'no-footer': noFooter,
      'first-page': firstPage,
      'has-overflow': hasOverflow
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
    <div v-if="!noFooter" class="page-footer">
      <span class="page-number-left"><span class="page-number" /></span>
      <span class="footer-center">Le Bottin de L'Étoile filante 2025-2026</span>
      <span class="page-number-right"><span class="page-number" /></span>
    </div>

    <!-- Optional footer slot -->
    <div v-if="$slots.footer" class="print-page-footer">
      <slot name="footer" />
    </div>
  </section>
</template>

<script setup>
  import { onMounted, ref } from 'vue'
  import { usePrintPageRegistry } from '@/composables/usePrintPageRegistry'

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
  })

  const { registerPage } = usePrintPageRegistry()

  const pageRef = ref(null)
  const hasOverflow = ref(false)

  // Register this page with the registry on component creation
  registerPage(props.id)

  onMounted(() => {
    // Check for content overflow on screen only
    if (import.meta.env.DEV && pageRef.value) {
      checkOverflow()

      // Re-check on window resize
      window.addEventListener('resize', checkOverflow)
    }
  })

  function checkOverflow () {
    if (!pageRef.value) return

    // Check if content height exceeds container height
    const element = pageRef.value
    const overflow = element.scrollHeight > element.clientHeight

    // Add a small threshold to avoid false positives from rounding/subpixel rendering
    const threshold = 2 // 2 pixels tolerance
    hasOverflow.value = (element.scrollHeight - element.clientHeight) > threshold

    // Debug logging in dev mode
    if (overflow) {
      console.log('Page overflow check:', {
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        difference: element.scrollHeight - element.clientHeight,
        hasOverflow: hasOverflow.value
      })
    }
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
  /* Exact page dimensions for US Letter */
  width: 8.5in;
  height: 11in;

  /* Account for page margins defined in @page rule */
  /* Default margins: 0.75in top/left/right, 1in bottom */
  box-sizing: border-box;
  padding: 0.75in 0.75in 1in 0.75in;

  /* Always start a new page when printing */
  page-break-before: always;
  page-break-after: always;
  page-break-inside: avoid;

  /* Prevent content overflow */
  overflow: hidden;

  /* Typography defaults */
  color: black;
  font-family: Avenir, 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 10pt;
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

.print-page-footer {
  flex-shrink: 0;
}

/* Screen-only: Document viewer styling */
@media screen {
  .print-page {
    /* Document-style presentation */
    margin: 1.5rem auto;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid #d0d0d0;
    position: relative;
  }

  .print-page.first-page {
    margin-top: 2rem;
  }

  /* Overflow indicator - shows when content is clipped */
  .print-page.has-overflow::after {
    content: '⚠️ CONTENT CLIPPED - This page has more content than fits';
    position: absolute;
    bottom: 0.5in;
    left: 0.75in;
    right: 0.75in;
    padding: 0.5rem;
    background: linear-gradient(to bottom, transparent, rgba(244, 67, 54, 0.2) 30%, rgba(244, 67, 54, 0.3));
    border: 2px solid #f44336;
    border-radius: 4px;
    color: #c62828;
    font-weight: bold;
    font-size: 11pt;
    text-align: center;
    pointer-events: none;
    z-index: 100;
  }
}

/* First page should not have page break before */
.print-page.first-page {
  page-break-before: avoid;
}

/* Pages with no footer get extra bottom padding */
.print-page.no-footer {
  padding-bottom: 0.75in;
}

/* Manual page footer */
.page-footer {
  position: absolute;
  bottom: 0.5in;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 9pt;
  color: #000;
  padding: 0 0.75in;
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
    padding: 0.75in 0.75in 1in 0.75in;

    /* Ensure exact page sizing */
    width: 100%;
    height: 100%;
    min-height: 100vh;
    max-height: 100vh;

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
    padding: 0.75in;
  }

  /* Ensure footer is visible and positioned correctly in print */
  .page-footer {
    position: absolute;
    bottom: 0.5in;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.75in;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9pt;
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0 0 1rem 0;
  padding: 0.5rem 0;
  border-bottom: 2px solid black;
}

.print-page :deep(h2) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18pt;
  font-weight: 600;
  margin: 1rem 0 0.5rem 0;
  color: #000;
}

.print-page :deep(h3) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: 600;
  margin: 0.5rem 0;
  color: #000;
  text-align: center;
}

.print-page :deep(.section-subtitle) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18pt;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #000;
}

.print-page :deep(.committee-title) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
  color: #000;
}

.print-page :deep(.group-title) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
  color: #000;
}

.print-page :deep(.subgroup-title) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #000;
}

.print-page :deep(.committee-category-title) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18pt;
  font-weight: 600;
  margin: 1.5rem 0 1rem 0;
  color: #000;
}
</style>
