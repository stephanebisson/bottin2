<template>
  <PrintPage id="section-schedule">
    <div class="page-header">
      <h1 class="section-title">Horaire</h1>
    </div>
    <h2>Lundi, mardi, jeudi, vendredi</h2>
    <p>Surveillance dans la cour à partir de 8h08</p>
    <div class="schedule-entry">
      <span class="time">8h13</span>
      <span class="what">Entrée des élèves</span>
    </div>
    <div class="schedule-entry">
      <span class="time">10h30 à 10h45</span>
      <span class="what">Récréation</span>
    </div>
    <div class="schedule-entry">
      <span class="time">11h47</span>
      <span class="what">Fin des cours</span>
    </div>
    <p>Période du dîner</p>
    <div class="schedule-entry">
      <span class="time">13h10</span>
      <span class="what">Entrée des élèves</span>
    </div>
    <div class="schedule-entry">
      <span class="time">14h18 à 14h33</span>
      <span class="what">Récréation</span>
    </div>
    <div class="schedule-entry">
      <span class="time">15h35</span>
      <span class="what">Fin des cours</span>
    </div>
    <h2>Mercredi</h2>
    <div class="schedule-entry">
      <span class="time">14h30</span>
      <span class="what">Fin des cours</span>
    </div>
  </PrintPage>
</template>

<script setup>
  import PrintPage from './PrintPage.vue'
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
