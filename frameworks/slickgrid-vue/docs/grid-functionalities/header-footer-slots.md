### Description
You can add Header and/or Footer to your grid by using the `#header` and `#footer` Slots, it's as simple as that. Using these slots also has the advantage of being contained in the same container making them the same width as the grid container.

### Demo

[Demo](https://ghiscoding.github.io/slickgrid-vue-demos/#/example29) / [Demo Component](https://github.com/ghiscoding/slickgrid-universal/blob/master/demos/vue/src/components/Example29.vue)

### Basic Usage

##### Component

```vue
<template>
  <slickgrid-vue v-model:options="gridOptions" v-model:columns="columnDefinitions" v-model:data="dataset" grid-id="grid2">
    <template #header>
      <div class="custom-header-slot">
        <h3>Grid with header and footer slot</h3>
      </div>
    </template>
    <template #footer>
      <div class="custom-footer-slot">
        <CustomFooter />
      </div>
    </template>
  </slickgrid-vue>
</template>
```