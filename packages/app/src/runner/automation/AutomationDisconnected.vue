<template>
  <AutInfo>
    <div class="flex flex-col bg-gray-50 text-gray-800 gap-16px items-center">
      <i-cy-cypress-logo_x64 class="h-64px w-64px" />
      <h1 class="font-bold text-3xl">
        {{ t('runner.automation.disconnected.title') }}
      </h1>
      <p>
        {{ t('runner.automation.disconnected.description') }}
      </p>
      <Button
        class="bg-indigo-500 text-white"
        size="md"
        variant="outline"
        :prefix-icon="RefreshIcon"
        prefix-icon-class="icon-dark-white"
        @click="relaunch"
      >
        {{ t('runner.automation.disconnected.reload') }}
      </Button>
      <div>
        <ExternalLink
          href="https://on.cypress.io/launching-browsers"
        >
          <i-cy-circle-bg-question-mark_x16 class="ml-8px -top-2px relative inline-block icon-dark-indigo-500 icon-light-indigo-100" />
          {{ t('runner.automation.disconnected.link') }}
        </ExternalLink>
      </div>
    </div>
  </AutInfo>
</template>

<script setup lang="ts">
import AutInfo from './AutInfo.vue'
import Button from '@cy/components/Button.vue'
import ExternalLink from '@cy/gql-components/ExternalLink.vue'
import RefreshIcon from '~icons/cy/refresh_x16'
import { gql } from '@urql/core'
import { useMutation } from '@urql/vue'
import { AutomationDisconnected_RelaunchBrowserDocument } from '../../generated/graphql'
import { useI18n } from '@cy/i18n'

const { t } = useI18n()

gql`
mutation AutomationDisconnected_RelaunchBrowser {
  launchOpenProject {
    id
  }
}
`

const gqlRelaunch = useMutation(AutomationDisconnected_RelaunchBrowserDocument)

const relaunch = () => gqlRelaunch.executeMutation({})

</script>
