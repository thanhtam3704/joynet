// Event Bus for Vue 3 (replacement for $root.$emit/$on/$off)
import { ref } from 'vue'

class EventBus {
  constructor() {
    this.events = {}
  }

  $emit(event, data) {
    if (!this.events[event]) return
    this.events[event].forEach(callback => callback(data))
  }

  $on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  $off(event, callback) {
    if (!this.events[event]) return
    
    if (callback) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    } else {
      delete this.events[event]
    }
  }
}

export const eventBus = new EventBus()
