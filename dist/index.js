'use strict';

var _sleep = require('./sleep');

var I2C = require('./i2cWrapper');


// ============================================================================
// Adafruit PCA9685 16-Channel PWM Servo Driver
// ============================================================================
module.exports = makePwmDriver;

function makePwmDriver(options) {
  // Registers/etc.
  var MODE1 = 0x00,
      MODE2 = 0x01,
      SUBADR1 = 0x02,
      SUBADR2 = 0x03,
      SUBADR3 = 0x04,
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
  var RESTART = 0x80,
      SLEEP = 0x10,
      ALLCALL = 0x01,
      INVRT = 0x10,
      OUTDRV = 0x04;

  var defaults = {
    address: 0x40,
    device: '/dev/i2c-1',
    debug: false,
    i2cDebug: false
  };

  var _Object$assign = Object.assign({}, defaults, options),
      address = _Object$assign.address,
      device = _Object$assign.device,
      debug = _Object$assign.debug,
      i2cDebug = _Object$assign.i2cDebug;

  var i2c = I2C(address, { device: device, i2cDebug: i2cDebug });
  var prescale = void 0;

  var init = function init() {
    if (debug) {
      console.log('device ' + device + ', address:' + address + ', debug:' + debug);
      console.log('Reseting PCA9685, mode1: ' + MODE1);
    }

    return setAllPWM(0, 0).then(function () {
      return i2c.writeBytes(MODE2, OUTDRV);
    }).then(function () {
      return i2c.writeBytes(MODE1, ALLCALL);
    }).then(function () {
      return (0, _sleep.usleep)(5000);
    }).then(function () {
      return i2c.readBytes(MODE1, 1);
    }).then(function (mode1) {
      mode1 = mode1 & ~SLEEP; // wake up (reset sleep)
      return i2c.writeBytes(MODE1, mode1);
    }).then(function () {
      return (0, _sleep.usleep)(5000);
    }) // wait for oscillator
    .then(function () {
      return debug ? console.log('init done ') : '';
    });
  };

  var setPWMFreq = function setPWMFreq(freq) {
    // "Sets the PWM frequency"
    var prescaleval = 25000000.0; // 25MHz
    prescaleval /= 4096.0; // 12-bit
    prescaleval /= freq;
    prescaleval -= 1.0;

    if (debug) {
      console.log('Setting PWM frequency to ' + freq + ' Hz');
      console.log('Estimated pre-scale: ' + prescaleval);
    }
    prescale = Math.floor(prescaleval + 0.5);
    if (debug) {
      console.log('Final pre-scale: ' + prescale);
    }

    var oldmode = void 0;
    var newmode = void 0;
    return i2c.readBytes(MODE1, 1).then(function (data) {
      oldmode = data[0];
      newmode = oldmode & 0x7F | 0x10; // sleep
      if (debug) {
        console.log('Prescale ' + Math.floor(prescale) + ', newMode: ' + newmode.toString(16));
      }
      return i2c.writeBytes(MODE1, newmode); // go to sleep
    }).then(function () {
      return i2c.writeBytes(PRESCALE, Math.floor(prescale));
    }).then(function () {
      return i2c.writeBytes(MODE1, oldmode);
    }).then(function () {
      return (0, _sleep.usleep)(5000);
    }).then(function () {
      return i2c.writeBytes(MODE1, oldmode | 0x80);
    });
  };

  // Sets a single PWM channel
  var setPWM = function setPWM(channel, on, off) {
    if (debug) {
      console.log('Setting PWM channel: ' + channel + ', on : ' + on + ' off ' + off);
    }
    return Promise.all([i2c.writeBytes(LED0_ON_L + 4 * channel, on & 0xFF), i2c.writeBytes(LED0_ON_H + 4 * channel, on >> 8), i2c.writeBytes(LED0_OFF_L + 4 * channel, off & 0xFF), i2c.writeBytes(LED0_OFF_H + 4 * channel, off >> 8)]);
    /*
    return i2c.writeBytes(LED0_ON_L + 4 * channel, on & 0xFF)
      .then(() => i2c.writeBytes(LED0_ON_H + 4 * channel, on >> 8))
      .then(() => i2c.writeBytes(LED0_OFF_L + 4 * channel, off & 0xFF))
      .then(() => i2c.writeBytes(LED0_OFF_H + 4 * channel, off >> 8));
    */
  };

  var setAllPWM = function setAllPWM(on, off) {
    return Promise.all([i2c.writeBytes(ALL_LED_ON_L, on & 0xFF), i2c.writeBytes(ALL_LED_ON_H, on >> 8), i2c.writeBytes(ALL_LED_OFF_L, off & 0xFF), i2c.writeBytes(ALL_LED_OFF_H, off >> 8)]);
    /*
    return i2c.writeBytes(ALL_LED_ON_L, on & 0xFF)
      .then(() => i2c.writeBytes(ALL_LED_ON_H, on >> 8))
      .then(() => i2c.writeBytes(ALL_LED_OFF_L, off & 0xFF))
      .then(() => i2c.writeBytes(ALL_LED_OFF_H, off >> 8));
    */
  };

  var stop = function stop() {
    return i2c.writeBytes(ALL_LED_OFF_H, 0x01);
  };

  return {
    init: init,
    setPWM: setPWM,
    setAllPWM: setAllPWM,
    setPWMFreq: setPWMFreq,
    stop: stop
  };
}