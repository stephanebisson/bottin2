<template>
  <PrintPage id="section-schedule">
    <div class="page-header">
      <h1 class="section-title">Horaire</h1>
    </div>

    <template v-for="(section, index) in schedule" :key="index">
      <h2>{{ section.title }}</h2>

      <template v-for="(item, itemIndex) in section.items" :key="itemIndex">
        <p v-if="item.type === 'note'">{{ item.text }}</p>
        <div v-else-if="item.type === 'entry'" class="schedule-entry">
          <span class="time">{{ item.time }}</span>
          <span class="what">{{ item.what }}</span>
        </div>
      </template>
    </template>
  </PrintPage>
</template>

<script setup>
  import PrintPage from './PrintPage.vue'

  const schedule = [
    {
      title: 'Lundi, mardi, jeudi, vendredi',
      items: [
        { type: 'note', text: 'Surveillance dans la cour à partir de 8 h 08' },
        { type: 'entry', time: '8 h 13', what: 'Entrée des élèves' },
        { type: 'entry', time: '10 h 30 à 10 h 45', what: 'Récréation' },
        { type: 'entry', time: '11 h 47', what: 'Fin des cours' },
        { type: 'note', text: 'Période du dîner' },
        { type: 'entry', time: '13 h 10', what: 'Entrée des élèves' },
        { type: 'entry', time: '14 h 18 à 14 h 33', what: 'Récréation' },
        { type: 'entry', time: '15 h 35', what: 'Fin des cours' }
      ]
    },
    {
      title: 'Mercredi',
      items: [
        { type: 'entry', time: '14 h 30', what: 'Fin des cours' }
      ]
    }
  ]
</script>

<style scoped>
.page-header {
  margin-bottom: 2rem;
}

h2 {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18pt;
  font-weight: 600;
  margin: 2rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #333;
  color: #000;
}

h2:first-of-type {
  margin-top: 0;
}

p {
  font-size: 12pt;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem 0;
  color: #333;
  font-style: italic;
}

.schedule-entry {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  margin: 0.75rem 0;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.schedule-entry .time {
  font-family: 'Courier New', Courier, monospace;
  font-size: 14pt;
  font-weight: 600;
  text-align: right;
  color: #666;
  order: 2;
}

.schedule-entry .what {
  font-size: 15pt;
  font-weight: 500;
  color: #000;
  order: 1;
}

/* Add some spacing between sections */
h2 + p {
  margin-top: 0.5rem;
}
</style>
