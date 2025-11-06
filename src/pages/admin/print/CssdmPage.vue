<template>
  <PrintPage :id="['section-cssdm', 'section-repaq']">
    <div class="committees-section">
      <!-- CSSDM Header -->
      <h1 class="section-title">Centre de services scolaire de Montréal</h1>

      <!-- CSSDM Address Information -->
      <div class="cssdm-info">
        <div v-if="CSSDM_INFO.addressLine1" class="cssdm-address">{{ CSSDM_INFO.addressLine1 }}</div>
        <div v-if="CSSDM_INFO.addressLine2" class="cssdm-address">{{ CSSDM_INFO.addressLine2 }}</div>
        <div v-if="CSSDM_INFO.phone" class="cssdm-phone">{{ formatPhone(CSSDM_INFO.phone) }}</div>
        <div v-if="CSSDM_INFO.email" class="cssdm-email">{{ CSSDM_INFO.email }}</div>
        <div v-if="CSSDM_INFO.url" class="cssdm-url">{{ CSSDM_INFO.url }}</div>
      </div>

      <!-- First Half: Comité des parents CSSDM -->
      <div class="cssdm-committee-section">
        <div v-for="committee in comiteParents" :key="committee.id" class="committee">
          <!-- Committee Name and Email/URL -->
          <div class="committee-header-inline">
            <h3 class="committee-name">
              {{ committee.name }}
              <span v-if="committee.description" class="committee-description">({{ committee.description }})</span>
            </h3>
            <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
          </div>

          <!-- Members grouped by role -->
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <CommitteeTable compact group-by-role :role-groups="getRoleGroups(committee)" />
          </div>
        </div>
      </div>

      <!-- Second Half: REPAQ -->
      <div id="section-repaq" class="cssdm-committee-section">
        <div v-for="committee in repaq" :key="committee.id" class="committee">
          <!-- Committee Header -->
          <div class="committee-header-repaq">
            <h1 class="committee-title-repaq">{{ committee.name }}</h1>
            <span v-if="committee.url" class="committee-url">{{ committee.url }}</span>
            <span v-else-if="committee.email" class="committee-email">{{ committee.email }}</span>
          </div>

          <!-- Members grouped by role -->
          <div v-if="committee.enrichedMembers.length > 0" class="committee-section-compact">
            <CommitteeTable compact group-by-role :role-groups="getRoleGroups(committee)" />
          </div>
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import { CSSDM_INFO } from '@/config/cssdm'
  import CommitteeTable from './components/CommitteeTable.vue'
  import PrintPage from './PrintPage.vue'

  const props = defineProps({
    comiteParents: {
      type: Array,
      required: true,
    },
    repaq: {
      type: Array,
      required: true,
    },
    roleGroupsMap: {
      type: Object,
      required: true,
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

  function getRoleGroups (committee) {
    return props.roleGroupsMap[committee.id] || []
  }
</script>

<style scoped>
/* CSSDM Section */
.cssdm-info {
  margin: 1.5rem 0 2rem 0;
  padding: 1rem 1.5rem;
  text-align: right;
}

.cssdm-address {
  font-size: 11pt;
  color: #000;
  line-height: 1.5;
}

.cssdm-phone {
  font-size: 11pt;
  font-weight: 600;
  color: #000;
  margin-top: 0.5rem;
}

.cssdm-email {
  font-size: 10pt;
  color: #000;
  margin-top: 0.25rem;
}

.cssdm-url {
  font-size: 10pt;
  color: #000;
  font-style: italic;
  margin-top: 0.25rem;
}

.cssdm-committee-section {
  margin-bottom: 2rem;
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

.committee-header-repaq {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid black;
}

.committee-title-repaq {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0;
}

.committee-url {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12pt;
  font-weight: 500;
  color: #000;
}

.committee-email {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12pt;
  font-weight: 500;
  color: #000;
}
</style>
