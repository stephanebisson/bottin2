<template>
  <!--
    Print Flow - A section that fills as many pages as its content needs

    Each element of the default slot is a block (a v-for of blocks counts one per item).
    The blocks are measured in off-screen copies of a first page and of a following page,
    then each page gets as many blocks as fit, in order. Headings stay with the next block;
    a block with class "break-before" starts a new page.

    The header slot gets { page, start, end }: the page index (0 for the first page) and
    the range of blocks on the page, e.g. for a letter range header.
  -->
  <PrintPage
    v-for="(range, pageIndex) in pageRanges"
    :id="pageIndex === 0 ? sectionId : undefined"
    :key="pageIndex"
  >
    <template v-if="$slots.header" #header>
      <slot :end="range.end" name="header" :page="pageIndex" :start="range.start" />
    </template>

    <BlockSlice :end="range.end" :start="range.start" />
  </PrintPage>

  <!-- Off-screen copies of a first page and a following page, to measure the blocks -->
  <Teleport to="body">
    <PrintPage ref="firstPageMeasure" measure>
      <template v-if="$slots.header" #header>
        <slot :end="1" name="header" :page="0" :start="0" />
      </template>

      <BlockSlice :end="Infinity" :start="0" />
    </PrintPage>

    <PrintPage ref="nextPageMeasure" measure>
      <template v-if="$slots.header" #header>
        <slot :end="1" name="header" :page="1" :start="0" />
      </template>
    </PrintPage>
  </Teleport>
</template>

<script setup>
  import { Comment, Fragment, onBeforeUnmount, onMounted, ref, Text, useSlots } from 'vue'
  import { measureBlocks, paginateByHeight } from '@/utils/printPagination'
  import PrintPage from './PrintPage.vue'

  defineProps({
    // Section ID for Table of Contents linking, set on the first page
    sectionId: {
      type: String,
      default: null,
    },
  })

  const slots = useSlots()

  const firstPageMeasure = ref(null)
  const nextPageMeasure = ref(null)
  const pageRanges = ref([])

  // The default slot's blocks, flattened out of v-for and v-if fragments
  function flattenBlocks (nodes) {
    return nodes.flatMap(node => {
      if (node.type === Fragment) {
        return flattenBlocks(node.children)
      }
      return node.type === Comment || node.type === Text ? [] : [node]
    })
  }

  // Renders the blocks from start to end (excluded)
  function BlockSlice (props) {
    return flattenBlocks(slots.default?.() ?? []).slice(props.start, props.end)
  }
  BlockSlice.props = ['start', 'end']

  // While printing, the measuring pages are not laid out: keep the pages as measured on screen
  const printing = window.matchMedia('print')

  async function paginate () {
    await document.fonts.ready
    if (printing.matches) return

    const firstContent = firstPageMeasure.value?.$el.querySelector('.print-page-content')
    const nextContent = nextPageMeasure.value?.$el.querySelector('.print-page-content')
    if (!firstContent || !nextContent) return

    const pages = paginateByHeight(
      measureBlocks(firstContent),
      firstContent.getBoundingClientRect().height,
      nextContent.getBoundingClientRect().height,
    )
    const ranges = pages.map(page => ({ start: page[0], end: page.at(-1) + 1 }))

    if (JSON.stringify(ranges) !== JSON.stringify(pageRanges.value)) {
      pageRanges.value = ranges
    }
  }

  // Re-paginate when the measured content changes (data reloaded) or a web font finishes loading
  const observer = new MutationObserver(paginate)

  onMounted(() => {
    paginate()
    observer.observe(firstPageMeasure.value.$el, { childList: true, subtree: true, characterData: true })
    document.fonts.addEventListener('loadingdone', paginate)
  })

  onBeforeUnmount(() => {
    observer.disconnect()
    document.fonts.removeEventListener('loadingdone', paginate)
  })
</script>
