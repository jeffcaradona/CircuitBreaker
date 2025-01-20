# CircuitBreaker.js

`CircuitBreaker.js` is a JavaScript implementation of the Circuit Breaker pattern. It is designed to prevent a system from repeatedly trying to execute an operation that is likely to fail, thereby allowing it to recover from failures gracefully. The implementation also tracks metrics such as the total number of requests and successful executions for enhanced monitoring.

---

## Features

- **Failure Threshold**: Automatically opens the circuit after a specified number of failures.
- **Reset Timeout**: Transitions from `OPEN` to `HALF_OPEN` after a configurable timeout.
- **Request Metrics**: Tracks total requests (`TOTAL_REQUEST_COUNT`) and successful executions (`SUCCESS_COUNT`).
- **Custom Fallbacks**: Allows defining fallback functions for open circuit and task failure scenarios.
- **Shared Memory Support**: Utilizes `SharedArrayBuffer` for thread-safe metrics.

---

## Usage

### Importing the CircuitBreaker

```javascript
import CircuitBreaker, { CircuitBreakerKeys } from "circuit-breaker-js";
```

### Creating a Circuit Breaker

```javascript
const sharedArray = new Int32Array(
  new SharedArrayBuffer(
    Object.keys(CircuitBreakerKeys).length * Int32Array.BYTES_PER_ELEMENT
  )
);

const breaker = new CircuitBreaker(
  sharedArray,
  5, // failureThreshold
  30000, // resetTimeout (ms)
  () => console.log("Circuit is open, fallback executed"), // openFallback
  () => console.log("Task failed, fallback executed") // failureFallback
);
```

---

### Using the Circuit Breaker

```javascript
async function task() {
  // Simulate a task with a 50% chance of failure
  if (Math.random() > 0.5) {
    return "Success";
  } else {
    throw new Error("Failure");
  }
}

breaker
  .execute(task)
  .then((result) => console.log("Task succeeded:", result))
  .catch((error) => console.log("Task failed:", error));
```

---

## Circuit Breaker Keys

- **`FAILURE_COUNT`**: Tracks the number of task failures.
- **`LAST_FAILURE_TIME`**: Records the timestamp of the most recent failure.
- **`STATE`**: Stores the current state (`CLOSED`, `OPEN`, `HALF_OPEN`).
- **`TOTAL_REQUEST_COUNT`**: Tracks the total number of task executions.
- **`SUCCESS_COUNT`**: Tracks the total number of successful task executions.

---

## Methods

### `execute(task: Function): Promise<any>`

Executes the provided task. If the circuit is `OPEN`, the `openFallback` is executed instead.

### `getState(): string`

Returns the current state of the circuit breaker (`CLOSED`, `OPEN`, or `HALF_OPEN`).

### `getSharedBuffer(): ArrayBuffer`

Returns the shared buffer used for storing metrics.

### `getTotalRequestCount(): number`

Returns the total number of requests executed by the circuit breaker.

### `getSuccessCount(): number`

Returns the total number of successful task executions.

---

## Example with Metrics

```javascript
const sharedArray = new Int32Array(
  new SharedArrayBuffer(
    Object.keys(CircuitBreakerKeys).length * Int32Array.BYTES_PER_ELEMENT
  )
);

const breaker = new CircuitBreaker(sharedArray, 3, 1000);

(async () => {
  try {
    await breaker.execute(async () => {
      if (Math.random() > 0.5) {
        return "Success";
      } else {
        throw new Error("Failure");
      }
    });
  } catch (error) {
    console.log("Task failed:", error.message);
  }

  console.log("Total Requests:", breaker.getTotalRequestCount());
  console.log("Successful Requests:", breaker.getSuccessCount());

  const lastSuccess = breaker.getLastSuccessTime();
  const lastFailure = breaker.getLastFailureTime();

  console.log("Last Success Time:", new Date(lastSuccess).toISOString());
  console.log("Last Failure Time:", new Date(lastFailure).toISOString());
})();
```

---

## Advanced Usage

### Customizing Metrics

You can utilize the `TOTAL_REQUEST_COUNT` and `SUCCESS_COUNT` to monitor the circuit's performance and system health in real-time.

---

## License

This project is licensed under the MIT License.
