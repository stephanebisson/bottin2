<template>
  <PrintPage :id="sectionId">
    <div class="committees-section">
      <h1 v-if="showMainTitle" class="section-title">Comités</h1>

      <!-- Category Title -->
      <h2 v-if="categoryTitle" class="committee-category-title">{{ categoryTitle }}</h2>

      <!-- Committees -->
      <div v-for="committee in committees" :key="committee.id" class="committee">
        <!-- Committee Name and Email/URL -->
        <div class="committee-header-inline">
          <h3 class="committee-name">
            {{ committee.name }}
            <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
          </h3>
          <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
          <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
        </div>

        <!-- Members -->
        <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
          <CommitteeTable compact :group-by-role="groupByRole" :members="committee.enrichedMembers" :role-groups="getRoleGroups(committee)" />
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import CommitteeTable from './components/CommitteeTable.vue'
  import PrintPage from './PrintPage.vue'

  const props = defineProps({
    committees: {
      type: Array,
      required: true,
    },
    categoryTitle: {
      type: String,
      default: '',
    },
    showMainTitle: {
      type: Boolean,
      default: false,
    },
    sectionId: {
      type: String,
      default: '',
    },
    groupByRole: {
      type: Boolean,
      default: false,
    },
    roleGroupsMap: {
      type: Object,
      default: () => ({}),
    },
  })

  function getRoleGroups (committee) {
    if (!props.groupByRole) return []
    return props.roleGroupsMap[committee.id] || []
  }
</script>

<style scoped>
/* Committees Section - Compact Layout (for other committees) */
.committee-category-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16pt;
  font-weight: 600;
  margin: 1.5rem 0 1rem 0;
  color: #000;
}

.committee {
  margin-bottom: 2rem;
  page-break-inside: avoid;
}

.committee-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #999;
}

.committee-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  margin: 0;
}

.committee-description {
  font-weight: normal;
  font-style: italic;
  color: #000;
  margin-left: 0.25rem;
}

.committee-email-inline {
  font-size: 10pt;
  font-weight: 500;
  color: #000;
}

.committee-url-inline {
  font-size: 10pt;
  font-weight: 500;
  color: #000;
}

.committee-section-compact {
  margin-bottom: 1rem;
}
</style>
