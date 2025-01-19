# CircuitBreaker.js

`CircuitBreaker.js` is a JavaScript implementation of the Circuit Breaker pattern. It is designed to prevent a system from repeatedly trying to execute an operation that is likely to fail, thereby allowing it to recover from failures gracefully.




## Usage

### Importing the CircuitBreaker

```javascript
import CircuitBreaker,{CircuitBreakerKeys} from 'circuit-breaker-js';
```

### Creating a Circuit Breaker

```javascript
const sharedArray = new Int32Array(new SharedArrayBuffer(Object.keys(CircuitBreakerKeys).length * Int32Array.BYTES_PER_ELEMENT));
const options = {
    failureThreshold: 5, // Number of failures before opening the circuit
    resetTimeout: 30000, // Time to wait before attempting to reset the breaker
    openFallback: () => console.log('Circuit is open, fallback executed'),
    failureFallback: () => console.log('Task failed, fallback executed')
};

const breaker = new CircuitBreaker(sharedArray, options.failureThreshold, options.resetTimeout, options.openFallback, options.failureFallback);
```

### Using the Circuit Breaker

```javascript
breaker.execute(task).then(result => {
    console.log('Task succeeded:', result);
}).catch(error => {
    console.log('Task failed:', error);
});

async function task() {
    // Perform the operation
    if (Math.random() > 0.5) {
        return 'Success';
    } else {
        throw new Error('Failure');
    }
}
```

### Events

You can listen to various events emitted by the Circuit Breaker:

```javascript
// No built-in event system, but you can use the fallback functions to handle events
```

## Options

- `failureThreshold`: The number of failures before opening the circuit.
- `resetTimeout`: The time in milliseconds to wait before attempting to reset the circuit breaker.
- `openFallback`: The fallback function to execute when the circuit is open.
- `failureFallback`: The fallback function to execute when the task fails.

## Methods

- `execute(task)`: Executes the task function. If the circuit is open, the openFallback function is executed instead.
- `getState()`: Returns the current state of the circuit breaker.
- `getSharedBuffer()`: Returns the shared buffer used by the circuit breaker.

## Example

```javascript
import CircuitBreaker,{CircuitBreakerKeys} from 'circuit-breaker-js';

const sharedArray = new Int32Array(new SharedArrayBuffer(Object.keys(CircuitBreakerKeys).length * Int32Array.BYTES_PER_ELEMENT));
const options = {
    failureThreshold: 5,
    resetTimeout: 30000,
    openFallback: () => console.log('Circuit is open, fallback executed'),
    failureFallback: () => console.log('Task failed, fallback executed')
};

const breaker = new CircuitBreaker(sharedArray, options.failureThreshold, options.resetTimeout, options.openFallback, options.failureFallback);

breaker.execute(async () => {
    if (Math.random() > 0.5) {
        return 'Success';
    } else {
        throw new Error('Failure');
    }
}).then(result => {
    console.log('Task succeeded:', result);
}).catch(error => {
    console.log('Task failed:', error);
});
```

## License

This project is licensed under the MIT License.
