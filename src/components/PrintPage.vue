<template>
  <section
    ref="pageRef"
    class="print-page"
    :class="{
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

    <!-- Optional footer slot -->
    <div v-if="$slots.footer" class="print-page-footer">
      <slot name="footer" />
    </div>
  </section>
</template>

<script setup>
  import { onMounted, ref } from 'vue'

  defineProps({
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
  })

  const pageRef = ref(null)
  const hasOverflow = ref(false)

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

@media print {
  .print-page {
    /* Remove screen-only styling */
    margin: 0;

    border: 0;

    /* Ensure exact page sizing */
    width: 100%;
    height: 100%;
    min-height: 100vh;
    max-height: 100vh;

    /* Force page breaks */
    page-break-before: always;
    page-break-after: always;
    page-break-inside: avoid;
  }

  .print-page.first-page {
    page-break-before: avoid;
  }
}
</style>
