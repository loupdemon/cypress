<template>
  <div :style="{width: `${windowWidth}px`}">
    <div class="border-dashed bg-gray-50 border-2 border-gray-200 rounded-8px m-20px py-32px px-16px">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRunnerStyle } from '../useRunnerStyle'

const { windowWidth } = useRunnerStyle()
</script>
