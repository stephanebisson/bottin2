<template>
  <PrintFlow :section-id="sectionId">
    <!-- Committee Header; following pages repeat the name -->
    <template #header="{ page }">
      <div class="committee-header">
        <h1 class="committee-title">
          {{ committee.name }}
          <span v-if="page > 0" class="committee-description">(suite)</span>
          <span v-else-if="committee.description" class="committee-description">({{ committee.description }})</span>
        </h1>

        <div v-if="page === 0" class="committee-contact">
          <div v-if="committee.email" class="committee-email">{{ committee.email }}</div>
          <div v-if="committee.phone" class="committee-phone">{{ formatPhoneForDisplay(committee.phone) }}</div>
          <div v-if="committee.url" class="committee-url">{{ committee.url }}</div>
        </div>
      </div>
    </template>

    <!-- Parent Members (only for committees with separated parent/staff); one table per role -->
    <template v-if="parentRoleGroups.length > 0">
      <h2 class="section-subtitle">Équipe parents</h2>

      <CommitteeTable
        v-for="roleGroup in parentRoleGroups"
        :key="roleGroup.role"
        class="role-table"
        group-by-role
        :role-groups="[roleGroup]"
      />
    </template>

    <!-- Staff Members (only for committees with separated parent/staff) -->
    <template v-if="staffRoleGroups.length > 0">
      <h2 class="section-subtitle">Équipe école</h2>

      <CommitteeTable
        v-for="roleGroup in staffRoleGroups"
        :key="roleGroup.role"
        class="role-table"
        group-by-role
        :role-groups="[roleGroup]"
      />
    </template>

    <!-- All Members (for committees without parent/staff separation) -->
    <CommitteeTable
      v-for="roleGroup in allRoleGroups"
      :key="roleGroup.role"
      class="role-table"
      group-by-role
      :role-groups="[roleGroup]"
    />
  </PrintFlow>
</template>

<script setup>
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'
  import CommitteeTable from './components/CommitteeTable.vue'
  import PrintFlow from './PrintFlow.vue'

  defineProps({
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
.committee-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.7rem;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid black;
  flex-shrink: 0;
}

.committee-title {
  flex: 1;
}

.committee-description {
  font-weight: normal;
  margin-left: 0.2rem;
}

.committee-contact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  text-align: right;
}

.committee-email,
.committee-phone,
.committee-url {
  font-size: var(--print-size-contact);
  font-weight: 500;
  color: #000;
  white-space: nowrap;
}

/* Separator between roles, and space before the second team */
.role-table + .role-table {
  border-top: 1px solid #ddd;
}

.role-table + .section-subtitle {
  margin-top: 0.7rem;
}
</style>
