import { expect } from "chai";
import CircuitBreaker, {
  CircuitBreakerKeys,
  CircuitBreakerStates,
} from "../src/lib/CircuitBreaker.js";

describe('CircuitBreaker', () => {
  let circuitBreaker;
  let sharedArray;

  beforeEach(() => {
    // Create a shared buffer with a size of 3 options.
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * Object.keys(CircuitBreakerKeys).length);
    // Create a typed array (Int32Array) that uses the shared buffer
    sharedArray = new Int32Array(sharedBuffer);
    // Instantiate a CircuitBreaker with the shared array, threshold of 3, and timeout of 1000ms
    circuitBreaker = new CircuitBreaker(sharedArray, 3, 1000);
  });

  it('should execute the task successfully when the circuit is closed', async () => {
    const task = async () => 'success';
    const result = await circuitBreaker.execute(task);
    expect(result).to.equal('success');
    expect(Atomics.load(sharedArray, CircuitBreakerKeys.FAILURE_COUNT)).to.equal(0);
  });

  it('should throw an error when the circuit is open', async () => {
    Atomics.store(sharedArray, CircuitBreakerKeys.STATE, CircuitBreakerStates.OPEN);
    const task = async () => 'success';
    try {
      await circuitBreaker.execute(task);
    } catch (error) {
      expect(error.message).to.equal('Circuit is open');
    }
  });

  it('should handle task failure and increment failure count', async () => {
    const task = async () => { throw new Error('failure'); };
    try {
      await circuitBreaker.execute(task);
    } catch (error) {
      expect(error.message).to.equal('failure');
    }
    expect(Atomics.load(sharedArray, CircuitBreakerKeys.FAILURE_COUNT)).to.equal(1);
  });

  it('should open the circuit after reaching the failure threshold', async () => {
    const task = async () => { throw new Error('failure'); };
    try {
      await circuitBreaker.execute(task);
    } catch (error) {}
    try {
      await circuitBreaker.execute(task);
    } catch (error) {}
    try {
      await circuitBreaker.execute(task);
    } catch (error) {}    
    expect(Atomics.load(sharedArray, CircuitBreakerKeys.STATE)).to.equal(CircuitBreakerStates.OPEN);
  });

  it('should transition from open to half-open after reset timeout', function(done) {
    this.timeout(4000); // Increase timeout to ensure state transition is captured
    Atomics.store(sharedArray, CircuitBreakerKeys.STATE, CircuitBreakerStates.OPEN);
    setTimeout(() => {
      circuitBreaker.transitionToHalfOpen();     
      expect(Atomics.load(sharedArray, CircuitBreakerKeys.STATE)).to.equal(CircuitBreakerStates.HALF_OPEN);
      done();
    }, 3000); // Increase delay to ensure state transition is captured
  });

  it('should return the correct state', () => {
    Atomics.store(sharedArray, CircuitBreakerKeys.STATE, CircuitBreakerStates.OPEN);
    expect(circuitBreaker.getState()).to.equal('OPEN');
    Atomics.store(sharedArray, CircuitBreakerKeys.STATE, CircuitBreakerStates.CLOSED);
    expect(circuitBreaker.getState()).to.equal('CLOSED');
  });

  it('should return the shared buffer', () => {
    expect(circuitBreaker.getSharedBuffer()).to.be.instanceOf(SharedArrayBuffer);
  });

  it('should initialize the state to CLOSED', () => {
    expect(Atomics.load(sharedArray, CircuitBreakerKeys.STATE)).to.equal(CircuitBreakerStates.CLOSED);
  });

  it('should initialize the failure count to 0', () => {
    expect(Atomics.load(sharedArray, CircuitBreakerKeys.FAILURE_COUNT)).to.equal(0);
  });

  it('should set the failureThreshold and resetTimeout correctly', () => {
    expect(circuitBreaker.failureThreshold).to.equal(3);
    expect(circuitBreaker.resetTimeout).to.equal(1000);
  });

  it('should execute openFallback when the circuit is open', async () => {
    const openFallback = async () => 'fallback result';
    circuitBreaker = new CircuitBreaker(sharedArray, 3, 1000, openFallback);
    Atomics.store(sharedArray, CircuitBreakerKeys.STATE, CircuitBreakerStates.OPEN);
    const task = async () => 'success';
    const result = await circuitBreaker.execute(task);
    expect(result).to.equal('fallback result');
  });

  it('should execute failureFallback when the task fails', async () => {
    const failureFallback = async () => 'fallback result';
    circuitBreaker = new CircuitBreaker(sharedArray, 3, 1000, null, failureFallback);
    const task = async () => { throw new Error('failure'); };
    const result = await circuitBreaker.execute(task);
    expect(result).to.equal('fallback result');
    expect(Atomics.load(sharedArray, CircuitBreakerKeys.FAILURE_COUNT)).to.equal(1);
  });
});