<template>
  <PrintPage :id="['section-cssdm', 'section-repaq']">
    <div class="committees-section">
      <!-- CSSDM Header -->
      <h1 class="section-title">Centre de services scolaire de Montréal</h1>

      <!-- CSSDM Address Information -->
      <div class="cssdm-info">
        <div v-if="CSSDM_INFO.addressLine1" class="cssdm-address">{{ CSSDM_INFO.addressLine1 }}</div>
        <div v-if="CSSDM_INFO.addressLine2" class="cssdm-address">{{ CSSDM_INFO.addressLine2 }}</div>
        <div v-if="CSSDM_INFO.phone" class="cssdm-phone">{{ formatPhoneForDisplay(CSSDM_INFO.phone) }}</div>
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

            <div class="committee-contact-inline">
              <span v-if="committee.email" class="committee-email-inline">{{ committee.email }}</span>
              <span v-if="committee.phone" class="committee-phone-inline">{{ formatPhoneForDisplay(committee.phone) }}</span>
              <span v-if="committee.url" class="committee-url-inline">{{ committee.url }}</span>
            </div>
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
            <div class="committee-title-wrapper-repaq">
              <h1 class="committee-title-repaq">{{ committee.name }}</h1>
              <div v-if="committee.description" class="committee-description-repaq">{{ committee.description }}</div>
            </div>

            <div class="committee-contact-repaq">
              <div v-if="committee.email" class="committee-email">{{ committee.email }}</div>
              <div v-if="committee.phone" class="committee-phone">{{ formatPhoneForDisplay(committee.phone) }}</div>
              <div v-if="committee.url" class="committee-url">{{ committee.url }}</div>
            </div>
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
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'
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

  function getRoleGroups (committee) {
    return props.roleGroupsMap[committee.id] || []
  }
</script>

<style scoped>
/* CSSDM Section */
.cssdm-info {
  margin: 1rem 0 1.4rem 0;
  padding: 0.7rem 1rem;
  text-align: right;
}

.cssdm-address {
  font-size: var(--print-size-contact);
  color: #000;
  line-height: 1.5;
}

.cssdm-phone {
  font-size: var(--print-size-contact);
  font-weight: 600;
  color: #000;
  margin-top: 0.35rem;
}

.cssdm-email {
  font-size: var(--print-size-contact);
  color: #000;
  margin-top: 0.2rem;
}

.cssdm-url {
  font-size: var(--print-size-contact);
  color: #000;
  font-style: italic;
  margin-top: 0.2rem;
}

.cssdm-committee-section {
  margin-bottom: 1.4rem;
}

.committee {
  margin-bottom: 1.4rem;
  page-break-inside: avoid;
}

.committee-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid #999;
}

/* Left-aligned, also when the description wraps (the page's h3 style centers) */
.committee-header-inline .committee-name {
  text-align: left;
}

.committee-name {
  font-size: var(--print-size-heading);
  font-weight: bold;
  margin: 0;
}

.committee-description {
  font-weight: normal;
  font-style: italic;
  color: #000;
  margin-left: 0.2rem;
}

.committee-contact-inline {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  text-align: right;
}

.committee-email-inline,
.committee-phone-inline,
.committee-url-inline {
  font-size: var(--print-size-contact);
  font-weight: 500;
  color: #000;
  white-space: nowrap;
}

.committee-section-compact {
  margin-bottom: 0.7rem;
}

.committee-header-repaq {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.7rem;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid black;
}

.committee-title-wrapper-repaq {
  flex: 1;
}

.committee-title-repaq {
  font-size: var(--print-size-title);
  font-weight: bold;
  margin: 0 0 0.2rem 0;
}

.committee-description-repaq {
  font-size: var(--print-size-heading);
  font-weight: normal;
  font-style: italic;
  color: #000;
  margin: 0;
}

.committee-contact-repaq {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  text-align: right;
}

.committee-url,
.committee-email,
.committee-phone {
  font-size: var(--print-size-contact);
  font-weight: 500;
  color: #000;
  white-space: nowrap;
}
</style>
