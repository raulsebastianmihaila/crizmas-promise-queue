(() => {
  'use strict';

  const isModule = typeof module === 'object' && typeof module.exports === 'object';

  function PromiseQueue({update, done, catch: catchCb} = {}) {
    let lastOperationIndex = 0;
    let lastSettledIndex = 0;
    let lifoPromise;
    let lifoResolve;
    let lifoReject;
    const awaitedPromises = new Set();
    const promiseQueue = {};

    promiseQueue.add = (promise) => {
      lastOperationIndex += 1;

      const promiseIndex = lastOperationIndex;

      awaitedPromises.add(promise);

      promise.then(res => {
        if (!awaitedPromises.has(promise)) {
          return;
        }

        if (promiseIndex > lastSettledIndex) {
          if (update) {
            update(res);
          }

          if (promiseIndex === lastOperationIndex) {
            lifoResolve(res);
            awaitedPromises.clear();

            lifoPromise = null;
            lastOperationIndex = 0;
            lastSettledIndex = 0;

            if (done) {
              done(res);
            }
          } else {
            lastSettledIndex = promiseIndex;
          }
        }
      }, err => {
        if (!awaitedPromises.has(promise)) {
          return;
        }

        lifoReject(err);
        awaitedPromises.clear();

        lifoPromise = null;
        lastOperationIndex = 0;
        lastSettledIndex = 0;

        if (catchCb) {
          catchCb(err);
        }
      });

      if (!lifoPromise) {
        lifoPromise = new Promise((resolve, reject) => {
          lifoResolve = resolve;
          lifoReject = reject;
        });
      }

      return lifoPromise;
    };

    return promiseQueue;
  }

  const moduleExports = PromiseQueue;

  if (isModule) {
    module.exports = moduleExports;
  } else {
    window.crizmas = window.crizmas || {};
    window.crizmas.PromiseQueue = moduleExports;
  }
})();
