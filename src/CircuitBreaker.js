/**
 * Enum for CircuitBreaker keys.
 * @readonly
 * @enum {number}
 */
export const CircuitBreakerKeys = {
  FAILURE_COUNT: 0,
  LAST_FAILURE_TIME: 1,
  STATE: 2,
  TOTAL_REQUEST_COUNT: 3,
  SUCCESS_COUNT: 4,
  LAST_SUCCESS_TIME: 5,
};

/**
 * Enum for CircuitBreaker states.
 * @readonly
 * @enum {number}
 */
export const CircuitBreakerStates = {
  CLOSED: 0,
  OPEN: 1,
  HALF_OPEN: 2,
};

/**
 * Class representing a CircuitBreaker.
 */
class CircuitBreaker {
  /**
   * Create a CircuitBreaker.
   * @param {Int32Array} sharedArray - The shared array to store state.
   * @param {number} failureThreshold - The number of failures before opening the circuit.
   * @param {number} resetTimeout - The time in milliseconds to wait before transitioning from open to half-open.
   * @param {Function} [openFallback=null] - The fallback function to execute when the circuit is open.
   * @param {Function} [failureFallback=null] - The fallback function to execute when the task fails.
   */
  constructor(
    sharedArray,
    failureThreshold,
    resetTimeout,
    openFallback = null,
    failureFallback = null
  ) {
    this.sharedArray = sharedArray;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.openFallback = openFallback;
    this.failureFallback = failureFallback;

    Atomics.store(
      this.sharedArray,
      CircuitBreakerKeys.STATE,
      CircuitBreakerStates.CLOSED
    );
    Atomics.store(this.sharedArray, CircuitBreakerKeys.FAILURE_COUNT, 0);
    Atomics.store(this.sharedArray, CircuitBreakerKeys.LAST_FAILURE_TIME, 0);
    Atomics.store(this.sharedArray, CircuitBreakerKeys.TOTAL_REQUEST_COUNT, 0);
    Atomics.store(this.sharedArray, CircuitBreakerKeys.SUCCESS_COUNT, 0);
    Atomics.store(this.sharedArray, CircuitBreakerKeys.LAST_SUCCESS_TIME, 0);
  }

  /**
   * Execute a task with circuit breaker protection.
   * @param {Function} task - The task to execute.
   * @returns {Promise<*>} The result of the task or the fallback.
   * @throws {Error} If the circuit is open and no openFallback is provided.
   */
  async execute(task) {
    // Increment the total request count
    Atomics.add(this.sharedArray, CircuitBreakerKeys.TOTAL_REQUEST_COUNT, 1);

    const state = Atomics.load(this.sharedArray, CircuitBreakerKeys.STATE);
    if (state === CircuitBreakerStates.OPEN) {
      if (this.openFallback) {
        return this.openFallback();
      }
      throw new Error("Circuit is open");
    }

    try {
      const result = await task();

      // Increment the success count if the task is successful
      Atomics.add(this.sharedArray, CircuitBreakerKeys.SUCCESS_COUNT, 1);
      Atomics.store(
        this.sharedArray,
        CircuitBreakerKeys.LAST_SUCCESS_TIME,
        Date.now()
      );
      // Reset the failure count
      Atomics.store(this.sharedArray, CircuitBreakerKeys.FAILURE_COUNT, 0);

      return result;
    } catch (error) {
      this.onFailure();
      if (this.failureFallback) {
        return this.failureFallback();
      }
      throw error;
    }
  }

  /**
   * Handle task failure.
   * @private
   */
  onFailure() {
    const failureCount =
      Atomics.add(this.sharedArray, CircuitBreakerKeys.FAILURE_COUNT, 1) + 1;

    Atomics.store(
      this.sharedArray,
      CircuitBreakerKeys.LAST_FAILURE_TIME,
      Date.now()
    );

    if (failureCount >= this.failureThreshold) {
      Atomics.store(
        this.sharedArray,
        CircuitBreakerKeys.STATE,
        CircuitBreakerStates.OPEN
      );

      setTimeout(() => {
        Atomics.store(
          this.sharedArray,
          CircuitBreakerKeys.STATE,
          CircuitBreakerStates.HALF_OPEN
        );
      }, this.resetTimeout + 1000); // Adjusted timeout to ensure state transition
    }
  }

  /**
   * Manually transition the circuit to the half-open state.
   */
  transitionToHalfOpen() {
    Atomics.store(
      this.sharedArray,
      CircuitBreakerKeys.STATE,
      CircuitBreakerStates.HALF_OPEN
    );
  }

  /**
   * Get the current state of the circuit breaker.
   * @returns {string} The current state as a string.
   */
  getState() {
    const state = Atomics.load(this.sharedArray, CircuitBreakerKeys.STATE);
    return Object.keys(CircuitBreakerStates).find(
      (key) => CircuitBreakerStates[key] === state
    );
  }

  /**
   * Get the shared buffer.
   * @returns {ArrayBuffer} The shared array buffer.
   */
  getSharedBuffer() {
    return this.sharedArray.buffer;
  }

  /**
   * Get the total number of requests.
   * @returns {number} The total request count.
   */
  getTotalRequestCount() {
    return Atomics.load(
      this.sharedArray,
      CircuitBreakerKeys.TOTAL_REQUEST_COUNT
    );
  }

  /**
   * Get the total number of successful requests.
   * @returns {number} The success count.
   */
  getSuccessCount() {
    return Atomics.load(this.sharedArray, CircuitBreakerKeys.SUCCESS_COUNT);
  }
  /**
   * Get the timestamp of the last successful task execution.
   * @returns {number} The last success time as a Unix timestamp (milliseconds since epoch).
   */
  getLastSuccessTime() {
    return Atomics.load(this.sharedArray, CircuitBreakerKeys.LAST_SUCCESS_TIME);
  }

  /**
   * Get the timestamp of the last task failure.
   * @returns {number} The last failure time as a Unix timestamp (milliseconds since epoch).
   */
  getLastFailureTime() {
    return Atomics.load(this.sharedArray, CircuitBreakerKeys.LAST_FAILURE_TIME);
  }
}

export default CircuitBreaker;
