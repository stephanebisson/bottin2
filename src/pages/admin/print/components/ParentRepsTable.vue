<template>
  <!--
    One line per parent representative, in three columns (name, phone, email) sized to their content
    across the full width: nothing wraps unless a line is wider than the page. A thin line separates
    them from the teacher.
  -->
  <div v-if="reps.length > 0" class="parent-reps">
    <table class="parent-reps-table">
      <tbody>
        <tr v-for="(rep, index) in reps" :key="index">
          <td class="parent-rep-name-cell"><RepIcon />{{ ' ' }}{{ rep.name }}</td>
          <td class="parent-rep-phone-cell">{{ rep.phone ? formatPhoneForDisplay(rep.phone) : '' }}</td>
          <td class="parent-rep-email-cell"><PrintEmail :email="rep.email || ''" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter'
  import PrintEmail from './PrintEmail.vue'
  import RepIcon from './RepIcon.vue'

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

  const reps = computed(() => [props.rep1, props.rep2].filter(Boolean))
</script>

<style scoped>
.parent-reps {
  border-top: 0.5pt solid #000;
  padding-top: 0.25rem;
  margin-bottom: 0.2rem;
}

/* No column widths: the table gives each column its full content width whenever the line fits */
.parent-reps-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--print-size-contact);
}

.parent-reps-table td {
  padding: 0.05rem 0.7rem 0.05rem 0;
  vertical-align: top;
}

.parent-reps-table td:last-child {
  padding-right: 0;
}

.parent-rep-phone-cell {
  white-space: nowrap;
}
</style>
