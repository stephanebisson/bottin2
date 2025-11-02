<template>
  <PrintPage :id="sectionId">
    <div class="appendix-section">
      <h1 class="section-title">{{ title }}</h1>
      <div class="placeholder-section">
        <p class="placeholder-text">
          {{ placeholderText }}
        </p>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import PrintPage from './PrintPage.vue'

  const props = defineProps({
    title: {
      type: String,
      required: true,
    },
    placeholderText: {
      type: String,
      default: '[À REMPLIR : Contenu de l\'annexe]',
    },
    sectionId: {
      type: String,
      default: '',
    },
  })
</script>

<style scoped>
/* Placeholder sections */
.placeholder-section {
  padding: 2rem;
  border: 2px dashed #ccc;
  background: #f9f9f9;
  text-align: center;
  min-height: 4in;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #000;
  font-style: italic;
  font-size: 12pt;
}

/* Print-specific styles */
@media print {
  .placeholder-section {
    border: none;
    background: transparent;
  }
}
</style>
