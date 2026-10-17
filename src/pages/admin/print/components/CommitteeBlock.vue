<template>
  <div class="committee">
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

    <div v-if="members.length > 0" class="committee-section-compact">
      <CommitteeTable compact :members="members" />
    </div>
  </div>
</template>

<script setup>
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'
  import CommitteeTable from './CommitteeTable.vue'

  defineProps({
    committee: {
      type: Object,
      required: true,
    },
    // Members to list (some committees leave out their volunteers)
    members: {
      type: Array,
      required: true,
    },
  })
</script>

<style scoped>
.committee {
  margin-bottom: 1.4rem;
}

.committee-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid #999;
}

.committee-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
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
  font-size: 9.5pt;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
}

.committee-section-compact {
  margin-bottom: 0.7rem;
}
</style>
