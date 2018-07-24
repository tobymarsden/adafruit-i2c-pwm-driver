const NanoTimer = require('nanotimer')

export function sleep (seconds) {
  return new Promise((resolve, reject) => {
    const timer = new NanoTimer();
    timer.setTimeout(() => resolve(seconds), '', `${seconds}s`);
    timer.clearInterval();
  });
}

export function usleep (micros) {
  return new Promise((resolve, reject) => {
    const timer = new NanoTimer();
    timer.setTimeout(() => resolve(micros), '', `${micros}u`);
    timer.clearInterval();
  });
}
