import wzTextarea from './src/index.vue'

wzTextarea.install = (Vue) => {
  Vue.component(wzTextarea.name, wzTextarea)
}

export default wzTextarea