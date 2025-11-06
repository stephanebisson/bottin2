<template>
  <PrintPage :id="sectionId">
    <div class="committee-full-page">
      <!-- Committee Header -->
      <div class="committee-header">
        <h1 class="committee-title">
          {{ committee.name }}
          <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
        </h1>
        <div class="committee-contact">
          <div v-if="committee.email" class="committee-email">{{ committee.email }}</div>
          <div v-if="committee.phone" class="committee-phone">{{ formatPhone(committee.phone) }}</div>
          <div v-if="committee.url" class="committee-url">{{ committee.url }}</div>
        </div>
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

  // Helper: Format phone number
  function formatPhone (phone) {
    if (!phone) return ''

    const cleaned = phone.toString().replace(/\D/g, '')

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }
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
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid black;
  flex-shrink: 0;
}

.committee-title {
  flex: 1;
}

.committee-description {
  font-weight: normal;
  margin-left: 0.25rem;
}

.committee-contact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  text-align: right;
}

.committee-email,
.committee-phone,
.committee-url {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12pt;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
}

.committee-section {
  min-height: 0;
  overflow: hidden;
  margin-bottom: 1rem;
}
</style>
