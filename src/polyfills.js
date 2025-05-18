/**
 * Polyfills for UXP environment
 * These polyfills need to load before any other modules
 */

// Use self-executing function to avoid polluting global scope
(function () {
  // Polyfill for queueMicrotask used by Lit and Spectrum Web Components
  if (typeof globalThis.queueMicrotask !== 'function') {
    // Define queueMicrotask globally for UXP environment
    globalThis.queueMicrotask = function (callback) {
      return Promise.resolve()
        .then(callback)
        .catch(function (error) {
          // Report errors to console instead of throwing during event processing
          console.error('queueMicrotask error:', error);
        });
    };
  }
})();

// Export an empty object to make webpack happy
export default {};
