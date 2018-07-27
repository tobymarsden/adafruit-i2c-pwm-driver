# Adafruit I2C PWM Driver

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)


## About

Node.js driver implementation for a PWM i2c device (PCA9685) present in these products:
- [Adafruit 16-Channel 12-bit PWM/Servo Driver - I2C interface - PCA9685](http://www.adafruit.com/products/815)
- [Adafruit 16-Channel PWM / Servo HAT for Raspberry Pi](https://www.adafruit.com/product/2327)

This project is a fork from [this project](https://github.com/dominicbosch/adafruit-i2c-pwm-driver) that is a fork from [this project](https://github.com/kaosat-dev/adafruit-i2c-pwm-driver) (original, unmaintained).<br/>
This bring the following to the original project:
- maintains promise chains
- servious code cleanup
- ES6 syntax
- improved debugging options

Try out this project with my [PWM Controller App](https://github.com/pozil/pwm-controller).


## Installation

Before installing the driver you need to enable i2c on the Raspberry Pi.<br/>
Follow [these steps](http://ozzmaker.com/i2c/) to enable it while ignoring the Python related instructions: you do not need to install `libi2c-dev` and `python-smbus` (first and last set of instructions).

Install the driver with this command:
```
npm i git://github.com/pozil/adafruit-i2c-pwm-driver.git
```


## Usage

```js
const makePwmDriver = require('adafruit-i2c-pwm-driver')
const pwmDriver = makePwmDriver({address: 0x40, device: '/dev/i2c-1', debug: true, i2cDebug: false})

pwmDriver.init()
  .then(() => pwmDriver.setPWMFreq(50))
  .then(() => pwmDriver.setPWM(2))// channel, on , off
  .catch(console.error);
```

To configure I2c on your Raspberry-pi / Beaglebone please see [here](https://npmjs.org/package/i2c)

you can find a simple example [here](https://raw.githubusercontent.com/kaosat-dev/adafruit-i2c-pwm-driver/master/examples/simple.js)


## API


`makePwmDriver({address:Number, device:String, debug:Bool, i2cDebug:Bool})`

Setting up a new PwmDriver

- `address`: Address of the i2c panel, e.g. 0x20
- `device`: Device name, e.g. '/dev/i2c-1' (defaults to /dev/i2c-1)
- `debug`: flag used to display debug messages
- `i2cDebug`: flag used to display i2c signals

`pwmDriver.init()`

Initialize the PwmDriver. Only required once after `makePwmDriver`. Returns a Promise.

`pwmDriver.setPWMFreq(frequency:Number)`

Set the PWM frequency to the provided value (in hertz). Returns a Promise.

`pwmDriver.setPWM(channel:Number, on:Number, off:Number)`

Sets a single PWM channel. Returns a Promise.

`pwmDriver.setALLPWM(channel:Number, on:Number, off:Number)`

Sets all PWM channels. Returns a Promise.

## License
MIT

Based on the [Adafruit's Raspberry-Pi Python Code Library](https://github.com/adafruit/Adafruit-Raspberry-Pi-Python-Code.git)

>  Here is a growing collection of libraries and example python scripts
>  for controlling a variety of Adafruit electronics with a Raspberry Pi

>  In progress!
>
>  Adafruit invests time and resources providing this open source code,
>  please support Adafruit and open-source hardware by purchasing
>  products from Adafruit!
>
>  Written by Limor Fried, Kevin Townsend and Mikey Sklar for Adafruit Industries.
>  BSD license, all text above must be included in any redistribution
>
>  To download, we suggest logging into your Pi with Internet accessibility and typing:
>  git clone https://github.com/adafruit/Adafruit-Raspberry-Pi-Python-Code.git

[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)
