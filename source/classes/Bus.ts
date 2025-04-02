export class EventBus {

  listeners: { [key: string]: Function[] };
  
  constructor() {
    this.listeners = {};
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback: Function) => callback());
    }
  }
}