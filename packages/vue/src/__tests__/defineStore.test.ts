import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { resetRegistry } from '@byrding/core'
import { defineStore } from '../defineStore.js'

beforeEach(() => {
  resetRegistry()
})

test('composable returns store state', () => {
  const useCounter = defineStore('counter', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })

  const TestComponent = defineComponent({
    setup() {
      return { store: useCounter() }
    },
    template: '<div>{{ store.count }}</div>',
  })

  const wrapper = mount(TestComponent)
  expect(wrapper.text()).toBe('0')
})

test('composable reflects action mutations', async () => {
  const useCounter = defineStore('counter2', () => {
    const store = { count: 0, increment() { store.count++ } }
    return store
  })

  const TestComponent = defineComponent({
    setup() {
      const store = useCounter()
      return { store }
    },
    template: '<div>{{ store.count }}</div>',
  })

  const wrapper = mount(TestComponent)
  wrapper.vm.store.increment()
  await wrapper.vm.$nextTick()
  expect(wrapper.text()).toBe('1')
})
