'use strict';

const PromiseQueue = require('../src/promise-queue.js');

describe('promise-queue', () => {
  describe('PromiseQueue', () => {
    test('throws if add input is not a promise', () => {
      expect.assertions(1);

      const promiseQueue = new PromiseQueue();

      expect(() => {
        promiseQueue.add(1);
      }).toThrowError(Error);
    });

    test('end result promise with no options', () => {
      expect.assertions(1);

      const promiseQueue = new PromiseQueue();

      return promiseQueue.add(Promise.resolve(1)).then((value) => {
        expect(value).toBe(1);
      });
    });

    test('end result promise is rejected', () => {
      expect.assertions(1);

      const promiseQueue = new PromiseQueue();

      return promiseQueue.add(Promise.reject(1)).catch((reason) => {
        expect(reason).toBe(1);
      });
    });

    test('end result', () => {
      expect.assertions(1);

      const promiseQueue = new PromiseQueue({
        done: (value) => {
          expect(value).toBe(1);
        }
      });

      promiseQueue.add(Promise.resolve(4));

      return promiseQueue.add(Promise.resolve(1));
    });

    test('later result', () => {
      expect.assertions(1);

      const promiseQueue = new PromiseQueue({
        done: (value) => {
          expect(value).toBe(4);
        }
      });

      promiseQueue.add(Promise.resolve().then(() => 1));

      return promiseQueue.add(Promise.resolve(4));
    });

    test('update', () => {
      expect.assertions(2);

      const resolutionValues = [1, 2];
      let resolutionIndex = 0;

      const promiseQueue = new PromiseQueue({
        update: (value) => {
          expect(value).toBe(resolutionValues[resolutionIndex]);

          resolutionIndex += 1;
        }
      });

      promiseQueue.add(Promise.resolve(1));

      return promiseQueue.add(Promise.resolve(2));
    });

    test('reverse update', () => {
      expect.assertions(1);

      const promiseQueue = new PromiseQueue({
        update: (value) => {
          expect(value).toBe(1);
        }
      });

      promiseQueue.add(Promise.resolve().then(() => 555));

      return promiseQueue.add(Promise.resolve(1));
    });

    test('later update with ignored fulfilled promise', () => {
      expect.assertions(2);

      const resolutionValues = [1, 2, 3];
      const resolutionIndeces = [0, 2];
      let resolutionStep = 0;

      const promiseQueue = new PromiseQueue({
        update: (value) => {
          expect(value).toBe(resolutionValues[resolutionIndeces[resolutionStep]]);

          resolutionStep += 1;
        }
      });

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(() => 1)));

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(
          () => Promise.resolve().then(() => 2))));

      return promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(() => 3)));
    });

    test('two later updates with ignored earlier fulfilled promise', () => {
      expect.assertions(2);

      const resolutionValues = [1, 2, 3];
      const resolutionIndeces = [1, 2];
      let resolutionStep = 0;

      const promiseQueue = new PromiseQueue({
        update: (value) => {
          expect(value).toBe(resolutionValues[resolutionIndeces[resolutionStep]]);

          resolutionStep += 1;
        }
      });

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(
          () => Promise.resolve().then(() => 1))));

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(() => 2)));

      return promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(
          () => Promise.resolve().then(() => 3))));
    });

    test('catch', () => {
      expect.assertions(2);

      const promiseQueue = new PromiseQueue({
        catch: (reason) => {
          expect(reason).toBe(1);
        }
      });

      promiseQueue.add(Promise.reject(1));

      return promiseQueue.add(Promise.resolve(2)).catch((reason) => {
        expect(reason).toBe(1);
      });
    });

    test('later update with ignored rejected promise', () => {
      expect.assertions(3);

      const resolutionValues = [1, 2, 3];
      const resolutionIndeces = [0, 2];
      let resolutionStep = 0;

      const promiseQueue = new PromiseQueue({
        update: (value) => {
          expect(value).toBe(resolutionValues[resolutionIndeces[resolutionStep]]);

          resolutionStep += 1;
        }
      });

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(() => 1)));

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(
          () => Promise.resolve().then(() => Promise.reject(2)))));

      return promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(() => 3))).then((result) => {
          expect(result).toBe(3);
        });
    });

    test('later update with ignored rejected promise and uncalled catch callback', () => {
      expect.assertions(4);

      const resolutionValues = [1, 2, 3];
      const resolutionIndeces = [0, 2];
      let resolutionStep = 0;
      const observation = jest.fn();

      const promiseQueue = new PromiseQueue({
        update: (value) => {
          expect(value).toBe(resolutionValues[resolutionIndeces[resolutionStep]]);

          resolutionStep += 1;
        },

        catch: () => {
          observation();
        }
      });

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(() => 1)));

      promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(
          () => Promise.resolve().then(() => Promise.reject(2)))));

      return promiseQueue.add(Promise.resolve().then(
        () => Promise.resolve().then(() => 3))).then((result) => {
          expect(result).toBe(3);
          expect(observation.mock.calls.length).toBe(0);
        });
    });

    test('superseded rejected promise rejects the queue while the queue is pending', () => {
      expect.assertions(3);

      const observation = jest.fn();
      const promiseQueue = new PromiseQueue({
        catch: () => {
          observation();
        }
      });

      const promise1 = promiseQueue.add(Promise.resolve().then(() => Promise.reject(1)));

      promiseQueue.add(Promise.resolve(2));

      const promise2 = promiseQueue.add(Promise.resolve().then(() => Promise.resolve(3)));

      return promise2.catch((reason) => {
        expect(reason).toBe(1);
        expect(observation.mock.calls.length).toBe(1);
        expect(promise1).toBe(promise2);
      });
    });

    test('slower intermediate promises are not awaited', () => {
      expect.assertions(1);

      let number = 1;
      const promiseQueue = new PromiseQueue();

      promiseQueue.add(new Promise((r) => setTimeout(r, 1000)).then(() => {
        number += 100;
      }));

      return promiseQueue.add(Promise.resolve(4)).then(() => {
        expect(number).toBe(1);
      });
    });

    test('add returns the same promise', () => {
      expect.assertions(2);

      const promiseQueue = new PromiseQueue();

      expect(promiseQueue.add(Promise.resolve())).toBe(promiseQueue.add(Promise.resolve()));
      expect(typeof promiseQueue.add(Promise.resolve()).then).toBe('function');
    });

    test('add returns a new promise if the old one is settled', () => {
      expect.assertions(1);

      const promiseQueue = new PromiseQueue();
      const promise = promiseQueue.add(Promise.resolve());

      return promise.then(() => {
        expect(promiseQueue.add(Promise.resolve()) === promise).toBe(false);
      });
    });

    test('fulfilled queue can still be used', () => {
      expect.assertions(2);

      const promiseQueue = new PromiseQueue();

      return promiseQueue.add(Promise.resolve(4)).then((result) => {
        expect(result).toBe(4);

        return promiseQueue.add(Promise.resolve(6)).then((result) => {
          expect(result).toBe(6);
        });
      });
    });

    test('rejected queue can still be used', () => {
      expect.assertions(2);

      const promiseQueue = new PromiseQueue();

      return promiseQueue.add(Promise.reject(4)).catch((reason) => {
        expect(reason).toBe(4);

        return promiseQueue.add(Promise.resolve(6)).then((result) => {
          expect(result).toBe(6);
        });
      });
    });
  });
});
