<template>
  <PrintPage>
    <div class="toc">
      <h1 class="section-title">Table des matières</h1>
      <div class="toc-items">
        <div v-for="item in tocItems" :key="item.section" class="toc-item">
          <span class="toc-label" v-html="item.label" />
          <span class="toc-dots" />
          <span class="toc-page">{{ getPageNumber(item.section) || '___' }}</span>
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import { usePrintPageRegistry } from '@/composables/usePrintPageRegistry'
  import PrintPage from './PrintPage.vue'

  const { getPageNumber } = usePrintPageRegistry()

  // Table of Contents structure
  const tocItems = [
    { section: 'section-staff', label: 'Personnel de l\'Étoile filante' },
    { section: 'section-sdg', label: 'Service de garde' },
    { section: 'section-committees', label: 'Conseil d\'établissement' },
    { section: 'section-fondation', label: 'Fondation de l\'école Étoile filante' },
    { section: 'section-comites', label: 'Comités' },
    { section: 'section-cssdm', label: 'Centre de services scolaire de Montréal' },
    { section: 'section-repaq', label: 'REPAQ' },
    { section: 'section-classes', label: 'Liste des classes (1<sup>e</sup>-2<sup>e</sup>)' },
    { section: 'section-classes-34', label: 'Liste des classes (3<sup>e</sup>-4<sup>e</sup>)' },
    { section: 'section-classes-56', label: 'Liste des classes (5<sup>e</sup>-6<sup>e</sup>)' },
    { section: 'section-families', label: 'Liste alphabétique des enfants' },
    { section: 'section-parents', label: 'Liste alphabétique des parents' },
    { section: 'section-referentiel', label: 'Référentiel pédagogique' },
    { section: 'section-implication', label: 'L\'implication parentale' },
    { section: 'section-faq1', label: 'Trucs et astuces pour les périodes de coéducation' },
  ]
</script>

<style scoped>
/* Table of Contents */
.toc {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toc-items {
  margin-top: 2rem;
}

.toc-item {
  display: flex;
  align-items: baseline;
  margin-bottom: 1rem;
  font-size: 14pt;
}

.toc-label {
  font-weight: bold;
  white-space: nowrap;
}

.toc-dots {
  flex: 1;
  border-bottom: 1px dotted #999;
  margin: 0 0.5rem;
  min-width: 2rem;
}

.toc-page {
  font-weight: bold;
  white-space: nowrap;
  text-align: right;
}
</style>
