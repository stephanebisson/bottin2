<template>
  <PrintPage :id="sectionId">
    <div class="committee-full-page">
      <!-- Committee Header -->
      <div class="committee-header">
        <h1 class="committee-title">{{ title }}</h1>
        <span v-if="committee.url" class="committee-url">{{ committee.url }}</span>
        <span v-else-if="committee.email" class="committee-email">{{ committee.email }}</span>
      </div>

      <!-- Parent Members Section (only for committees with separated parent/staff) -->
      <div v-if="parentRoleGroups.length > 0" class="committee-section">
        <h2 class="section-subtitle">Équipe parents</h2>
        <CommitteeTable group-by-role :role-groups="parentRoleGroups" />
      </div>

      <!-- Staff Members Section (only for committees with separated parent/staff) -->
      <div v-if="staffRoleGroups.length > 0" class="committee-section">
        <h2 class="section-subtitle">Équipe école</h2>
        <CommitteeTable group-by-role :role-groups="staffRoleGroups" />
      </div>

      <!-- All Members (for committees without parent/staff separation) -->
      <div v-if="allRoleGroups.length > 0" class="committee-section">
        <CommitteeTable group-by-role :role-groups="allRoleGroups" />
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import CommitteeTable from './components/CommitteeTable.vue'
  import PrintPage from './PrintPage.vue'

  const props = defineProps({
    committee: {
      type: Object,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    sectionId: {
      type: String,
      default: '',
    },
    parentRoleGroups: {
      type: Array,
      default: () => [],
    },
    staffRoleGroups: {
      type: Array,
      default: () => [],
    },
    allRoleGroups: {
      type: Array,
      default: () => [],
    },
  })
</script>

<style scoped>
/* Committees Section - Full Page Layout */
.committee-full-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.committee-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid black;
  flex-shrink: 0;
}

.committee-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
}

.committee-email {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12pt;
  font-weight: 500;
  color: #000;
}

.committee-url {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12pt;
  font-weight: 500;
  color: #000;
}

.committee-section {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  margin-bottom: 1rem;
}

.section-subtitle {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16pt;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #000;
}
</style>
