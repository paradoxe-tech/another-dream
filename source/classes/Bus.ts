export class EventBus {

  listeners: { [key: string]: Function[] };
  
  constructor() {
    this.listeners = {};
  }

  // Add listener to callback array
  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Delete all listeners
  remove(event: string) {
    if(this.listeners[event]) this.listeners[event] = [];
  }

  // Delete all listeners for an event, then add a new one
  replace(event: string, callback: Function) {
    this.listeners[event] = [callback];
  }

  // Trigger event
  emit(event: string, data: object = {}) {
    console.debug(`Event trigger on game bus : ${event} with data ${data || ""}`);
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback: Function) => callback(data));
    }
  }

  // for debug purpose : list handlers
  list(event: string) {
    console.log(`Handlers connected to ${event} :`);
    console.dir(this.listeners[event]);
  }
}