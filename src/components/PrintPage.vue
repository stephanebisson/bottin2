<template>
  <section
    class="print-page"
    :class="{
      'no-footer': noFooter,
      'first-page': firstPage
    }"
  >
    <slot />
  </section>
</template>

<script setup>
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

  border-bottom: 1px black solid;

  /* Visual container on screen */
  margin: 0 auto;
  background: white;

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
