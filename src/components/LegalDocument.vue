<template>
  <v-container class="py-8">
    <v-row class="justify-center">
      <v-col cols="12" lg="8" md="10">
        <v-card>
          <v-card-text class="pa-6 pa-md-8">
            <h1 class="text-headline-large font-weight-bold mb-2">
              {{ $i18n(`${prefix}.title`) }}
            </h1>

            <p class="text-body-medium text-medium-emphasis mb-6">
              {{ $i18n('legal.effectiveDate') }}
            </p>

            <p class="text-body-large mb-6 legal-text">
              {{ $i18n(`${prefix}.intro`) }}
            </p>

            <section v-for="(section, index) in sections" :key="section" class="mb-6">
              <h2 class="text-title-large font-weight-bold mb-2">
                {{ index + 1 }}. {{ $i18n(`${prefix}.${section}Title`) }}
              </h2>

              <p class="text-body-large legal-text">
                {{ $i18n(`${prefix}.${section}Body`) }}
              </p>
            </section>

            <v-divider class="my-6" />

            <div class="d-flex flex-wrap ga-4">
              <router-link :to="otherLink.to">
                {{ $i18n(otherLink.label) }}
              </router-link>

              <span v-if="frenchPrevails" class="text-body-medium text-medium-emphasis">
                {{ $i18n('legal.frenchPrevails') }}
              </span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-banana-i18n'

  const props = defineProps({
    prefix: { type: String, required: true },
    sections: { type: Array, required: true },
  })

  const bananaI18n = useI18n()

  // English readers are told the French version governs (Charter of the French language)
  const frenchPrevails = computed(() => bananaI18n.locale !== 'fr')

  const otherLink = computed(() => props.prefix === 'terms'
    ? { to: '/privacy', label: 'legal.privacyPolicy' }
    : { to: '/terms', label: 'legal.termsOfUse' })
</script>

<style scoped>
.legal-text {
  white-space: pre-line;
}
</style>
