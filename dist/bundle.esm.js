/**
 * Wraps i2c readBytes, writeBytes functions into async functions
 * @param {binary} address 
 * @param {Object} param1 
 * @param {boolean} isMockDriver 
 */
function makeI2CWrapper(address, {device, debug}, isMockDriver) {
  // Only load I2C dependency if this is not a mock driver
  // This allows to compile on a non Linux OS
  let i2c = null;
  if (!isMockDriver) {
    const I2C = require('@abandonware/i2c');
    i2c = new I2C(address, {device});
  }

  async function readBytes(cmd, length) {
    return new Promise((resolve, reject) => {
      if (isMockDriver) {
        // Fake read data
        const fakeRead = [];
        for (let i=0; i<length; i++) {
          fakeRead.push(0x00);
        }
        resolve(fakeRead);
      } else {
        // Read actual data
        i2c.readBytes(cmd, length, (error, data) => {
          if (error) {
            return reject(error);
          }
          resolve(data);
        });
      }
    });
  }
  async function writeBytes(cmd, buf) {
    if (!(buf instanceof Array)) {
      buf = [buf];
    }
    if (debug) {
      console.log(`cmd ${cmd.toString(16)} values ${buf}`);
    }

    return new Promise((resolve, reject) => {
      if (isMockDriver) {
        // Fake write data
        resolve();
      } else {
        // Write actual data
        i2c.writeBytes(cmd, buf, (error, data) => {
          if (error) {
            return reject(error);
          }
          resolve(data);
        });
      }
    });
  }
  return {
    readBytes,
    writeBytes
  };
}

const NanoTimer = require('nanotimer');

/**
 * Wait a number of seconds
 * @param {number} seconds 
 */
async function sleep(seconds) {
  return new Promise(resolve => {
    const timer = new NanoTimer();
    timer.setTimeout(() => resolve(seconds), '', `${seconds}s`);
    timer.clearInterval();
  });
}

/**
 * Wait a number of microseconds
 * @param {number} microseconds 
 */
async function usleep(micros) {
  return new Promise(resolve => {
    const timer = new NanoTimer();
    timer.setTimeout(() => resolve(micros), '', `${micros}u`);
    timer.clearInterval();
  });
}

// ============================================================================
// Adafruit PCA9685 16-Channel PWM Servo Driver
// ============================================================================

// Registers/etc.
const MODE1 = 0x00,
  MODE2 = 0x01,
  PRESCALE = 0xFE,
  LED0_ON_L = 0x06,
  LED0_ON_H = 0x07,
  LED0_OFF_L = 0x08,
  LED0_OFF_H = 0x09,
  ALL_LED_ON_L = 0xFA,
  ALL_LED_ON_H = 0xFB,
  ALL_LED_OFF_L = 0xFC,
  ALL_LED_OFF_H = 0xFD;

// Bits:
const SLEEP = 0x10,
  ALLCALL = 0x01,
  OUTDRV = 0x04;

const DEFAULTS = {
  address: 0x40,
  device: '/dev/i2c-1',
  debug: false,
  i2cDebug: false,
  isMockDriver: false
};


class PwmDriver {

  constructor(options) {
    const {address, device, debug, i2cDebug, isMockDriver} = Object.assign({}, DEFAULTS, options);
    
    if (debug) {
      console.log(`Setting up PWM driver with device ${device}, address:${address}, debug:${debug}`);
    }
    
    this.debug = debug;
    this.prescale = null;
    this.i2c = makeI2CWrapper(address, {device, i2cDebug}, isMockDriver);
  }
  
  /**
   * Initializes the device driver
   * @returns a promise that resolves when operation completes
   */
  async init() {
    if (this.debug) {
      console.log(`Resetting PCA9685, mode1: ${MODE1}`);
    }

    return this.setAllPWM(0, 0)
      .then(() => this.i2c.writeBytes(MODE2, OUTDRV))
      .then(() => this.i2c.writeBytes(MODE1, ALLCALL))
      .then(() => usleep(5000))
      .then(() => this.i2c.readBytes(MODE1, 1))
      .then(mode1 => {
        mode1 = mode1 & ~SLEEP; // wake up (reset sleep)
        return this.i2c.writeBytes(MODE1, mode1);
      })
      .then(() => usleep(5000)) // wait for oscillator
      .then(() => {
        return new Promise((resolve, reject) => {
          if (this.debug) {
            console.log('PWM driver initialized');
          }
          resolve();
        });
      });
  };

  /**
   * Sets the PWM frequency
   * @param {number} freq - PWM frequency
   * @returns a promise that resolves when operation completes
   */
  async setPWMFreq(freq) {
    let prescaleval = 25000000.0; // 25MHz
    prescaleval /= 4096.0; // 12-bit
    prescaleval /= freq;
    prescaleval -= 1.0;

    if (this.debug) {
      console.log(`Setting PWM frequency to ${freq} Hz`);
      console.log(`Estimated pre-scale: ${prescaleval}`);
    }
    this.prescale = Math.floor(prescaleval + 0.5);
    if (this.debug) {
      console.log(`Final pre-scale: ${this.prescale}`);
    }

    let oldmode;
    let newmode;
    return this.i2c.readBytes(MODE1, 1)
      .then(data => {
        oldmode = data[0];
        newmode = (oldmode & 0x7F) | 0x10; // sleep
        if (this.debug) {
          console.log(`Prescale ${Math.floor(this.prescale)}, newMode: ${newmode.toString(16)}`);
        }
        return this.i2c.writeBytes(MODE1, newmode); // go to sleep
      })
      .then(() => this.i2c.writeBytes(PRESCALE, Math.floor(this.prescale)))
      .then(() => this.i2c.writeBytes(MODE1, oldmode))
      .then(() => usleep(5000))
      .then(() => this.i2c.writeBytes(MODE1, oldmode | 0x80));
  };

  /**
   * Sets a single PWM channel
   * @param {number} channel - PWM channel
   * @param {number} on - On frequency
   * @param {number} off - Off frequency
   * @returns a promise that resolves when operation completes
   */
  async setPWM(channel, on, off) {
    if (this.debug) {
      console.log(`Setting PWM channel: ${channel}, on : ${on} off ${off}`);
    }
    return this.i2c.writeBytes(LED0_ON_L + 4 * channel, on & 0xFF)
      .then(() => this.i2c.writeBytes(LED0_ON_H + 4 * channel, on >> 8))
      .then(() => this.i2c.writeBytes(LED0_OFF_L + 4 * channel, off & 0xFF))
      .then(() => this.i2c.writeBytes(LED0_OFF_H + 4 * channel, off >> 8));
  }

  /**
   * Sets all PWM channels
   * @param {number} on
   * @param {number} off
   * @returns a promise that resolves when operation completes
   */
  async setAllPWM(on, off) {
    return this.i2c.writeBytes(ALL_LED_ON_L, on & 0xFF)
      .then(() => this.i2c.writeBytes(ALL_LED_ON_H, on >> 8))
      .then(() => this.i2c.writeBytes(ALL_LED_OFF_L, off & 0xFF))
      .then(() => this.i2c.writeBytes(ALL_LED_OFF_H, off >> 8));
  }

  /**
   * Stops device
   * @returns a promise that resolves when operation completes
   */
  async stop() {
    return this.i2c.writeBytes(ALL_LED_OFF_H, 0x01);
  }
}

export { PwmDriver, sleep, usleep };
