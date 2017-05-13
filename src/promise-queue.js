(() => {
  'use strict';

  const isModule = typeof module === 'object' && typeof module.exports === 'object';

  function PromiseQueue({update, done, catch: catchCb} = {}) {
    let lastOperationId = 0;
    let lastSettledId = 0;
    let lifoPromise;
    let lifoResolve;
    let lifoReject;
    const awaitedPromises = new Set();
    const promiseQueue = {};

    promiseQueue.add = (promise) => {
      lastOperationId += 1;

      const promiseId = lastOperationId;

      awaitedPromises.add(promise);

      promise.then((res) => {
        if (!awaitedPromises.has(promise)) {
          return;
        }

        if (promiseId > lastSettledId) {
          if (update) {
            update(res);
          }

          if (promiseId === lastOperationId) {
            lifoResolve(res);
            awaitedPromises.clear();

            lifoPromise = null;
            lastOperationId = 0;
            lastSettledId = 0;

            if (done) {
              done(res);
            }
          } else {
            lastSettledId = promiseId;
          }
        }
      }, (err) => {
        if (!awaitedPromises.has(promise)) {
          return;
        }

        lifoReject(err);
        awaitedPromises.clear();

        lifoPromise = null;
        lastOperationId = 0;
        lastSettledId = 0;

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
