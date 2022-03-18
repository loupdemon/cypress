<template>
  <AutInfo>
    <div class="flex flex-col bg-gray-50 text-gray-800 gap-16px items-center">
      <i-cy-cypress-logo_x64 class="h-64px w-64px" />
      <h1 class="font-bold text-center text-3xl">
        {{ t('runner.automation.missing.title') }}
      </h1>
      <p>
        {{ t('runner.automation.missing.description') }}
      </p>
      <SpecRunnerDropdown
        v-if="props.gql && selectedBrowser?.displayName"
        data-cy="select-browser"
      >
        <template #heading>
          <img
            class="min-w-16px w-16px"
            :src="allBrowsersIcons[selectedBrowser.displayName]"
          >
          {{ selectedBrowser.displayName }} {{ selectedBrowser.majorVersion }}
        </template>

        <template #default>
          <div class="max-h-50vh overflow-auto">
            <VerticalBrowserListItems
              :gql="props.gql"
            />
          </div>
        </template>
      </SpecRunnerDropdown>
      <div>
        <ExternalLink
          href="https://on.cypress.io/launching-browsers"
        >
          <i-cy-circle-bg-question-mark_x16 class="ml-8px -top-2px relative inline-block icon-dark-indigo-500 icon-light-indigo-100" />
          {{ t('runner.automation.missing.link') }}
        </ExternalLink>
      </div>
    </div>
  </AutInfo>
</template>

<script setup lang="ts">
import AutInfo from './AutInfo.vue'
import ExternalLink from '@cy/gql-components/ExternalLink.vue'
import { gql } from '@urql/core'
import { useI18n } from '@cy/i18n'
import VerticalBrowserListItems from '@cy/gql-components/topnav/VerticalBrowserListItems.vue'
import type { AutomationMissingFragment } from '../../generated/graphql'
import SpecRunnerDropdown from '../SpecRunnerDropdown.vue'
import { ref } from 'vue'
import { allBrowsersIcons } from '@packages/frontend-shared/src/assets/browserLogos'

const { t } = useI18n()

gql`
fragment AutomationMissing on CurrentProject {
  id
  ...VerticalBrowserListItems
  currentBrowser {
    id
    displayName
    majorVersion
  }
}
`

const props = withDefaults(defineProps<{ gql: AutomationMissingFragment | null }>(), { gql: null })

// Have to spread gql props since binding it to v-model causes error when testing
const selectedBrowser = ref({ ...props.gql?.currentBrowser })

</script>
