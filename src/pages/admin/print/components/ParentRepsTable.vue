<template>
  <div v-if="rep1 || rep2" class="class-parent-reps-section">
    <strong>Représentants des parents</strong>
    <table class="parent-reps-table">
      <tbody>
        <tr v-if="rep1">
          <td class="parent-rep-name-cell">{{ rep1.name }}</td>
          <td class="parent-rep-phone-cell">{{ rep1.phone ? formatPhoneForDisplay(rep1.phone) : '' }}</td>
          <td class="parent-rep-email-cell">{{ rep1.email || '' }}</td>
        </tr>
        <tr v-if="rep2">
          <td class="parent-rep-name-cell">{{ rep2.name }}</td>
          <td class="parent-rep-phone-cell">{{ rep2.phone ? formatPhoneForDisplay(rep2.phone) : '' }}</td>
          <td class="parent-rep-email-cell">{{ rep2.email || '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'

  const props = defineProps({
    rep1: {
      type: Object,
      default: null,
    },
    rep2: {
      type: Object,
      default: null,
    },
  })

</script>

<style scoped>
.class-parent-reps-section {
  font-size: 9.5pt;
  margin-bottom: 0.6rem;
}

.class-parent-reps-section strong {
  display: block;
  margin-bottom: 0.1rem;
}

.parent-reps-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0;
  font-size: 8.5pt;
}

.parent-reps-table tbody tr {
  border-bottom: none;
}

.parent-reps-table td {
  padding: 0.1rem 0.5rem;
  vertical-align: top;
}

.parent-rep-name-cell {
  width: 33%;
  font-weight: 600;
}

.parent-rep-phone-cell {
  width: 33%;
}

.parent-rep-email-cell {
  width: 34%;
  word-break: break-word;
}
</style>
