export class eventHub {

  #registeredEvents = {};
  #registeredOneTimeEvents = {};
  #registeredDestinations = {};

  constructor(name) {
    this.name = name;
  }

  async once(event, callback, priority) {
    if (typeof(callback) !== 'function') return console.warn(`${this.name}: callback must be a function!`);
    if (!this.#registeredOneTimeEvents[event]) this.#registeredOneTimeEvents[event] = [];
    let targetIndex = priority ? Math.min(priority, this.#registeredOneTimeEvents[event].length - 1) : this.#registeredOneTimeEvents[event].length;
    this.#registeredOneTimeEvents[event][targetIndex] = callback;
  }

  async on(event, callback, priority) {
    if (typeof(callback) !== 'function') return console.warn(`${this.name}: callback must be a function!`);
    if (!this.#registeredEvents[event]) this.#registeredEvents[event] = [];
    let targetIndex = priority ? Math.min(priority, this.#registeredEvents[event].length - 1) : this.#registeredEvents[event].length;
    this.#registeredEvents[event][targetIndex] = callback;
  }

  async off(event, callback) {
    if (this.#registeredEvents[event]) {
      if (!callback) this.#registeredEvents[event] = [];
      else this.#registeredEvents[event] = this.#registeredEvents[event].filter(cb => cb !== callback);
    }
  }

  async for(destination, callback, priority) {
    if (typeof(callback) !== 'function') return console.warn(`${this.name}: destination callback must be a function!`);
    if (!this.#registeredDestinations[destination]) this.#registeredDestinations[destination] = [];
    let targetIndex = priority ? Math.min(priority, this.#registeredDestinations[destination].length - 1) : this.#registeredDestinations[destination].length;
    this.#registeredDestinations[destination][targetIndex] = callback;
  }

  // Supply a '/' in event name to signify a destination and send to a 'for' registered handler
  // 'main/requestHtml' will send the event to the 'for' handler 'main', with {event: requestHtml, data: {...args}} as parameters
  async trigger(event, ...args) {
    // Check 'for' handlers first, to send event to correct event hub
    if (/\//.test(event)) {
      let parts = event.match(/^(\w+)\/(\w+)/);
      if (parts && parts[1] && parts[2]) this.triggerFor(parts[1], parts[2], ...args);
      else console.warn(`${this.name}: Bad 'for' trigger: ${event}`);
    } else {
      console.log(`${this.name}: "${event}" triggered.`);
      // Check 'once' one time events next
      (this.#registeredOneTimeEvents[event]||[]).forEach((cb, i) => {
        cb(...args);
        this.#registeredOneTimeEvents[event][i] = null;
      });
      (this.#registeredOneTimeEvents[event]||[]).filter(v=>v);
      // And finally, normal 'on' events
      (this.#registeredEvents[event]||[]).forEach(cb => cb(...args));
    }
  }

  async triggerFor(destination, event, ...args) {
    console.log(`${this.name}: target hub "${destination}" triggered event "${event}".`);
    (this.#registeredDestinations[destination]||[]).forEach(cb => cb(event, ...args));
  }

}