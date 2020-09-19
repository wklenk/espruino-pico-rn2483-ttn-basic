/*
  Simple LoRaWAN node targeted to The Things Network (TTN)
  using Espruino Pico and Microchip RN2483 LoRa Technology Module.
  There is a focus on low power consumption, targeting more than one year of
  operation on a single battery.

  As optional sensor a MB1242 I2CXL-MaxSonar-EZ4 is used, that is connected via I2C.
  It returns the distance in centimeter as an array of 2 bytes.

  Note: If you have chosen to upload the code to RAM (default) in the Espruino IDE, you need
        to interactively call "onInit();" on the device's JavaScript console after uploading.


  Copyright (C) 2020  Wolfgang Klenk <wolfgang.klenk@gmail.com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/

// Some radio modules (such as the RN2483) also enforce the duty cycle limits. 
// https://www.thethingsnetwork.org/docs/lorawan/duty-cycle.html

// Seems already to use frequency plan EU863-870 of The Things Network TTN
// https://www.thethingsnetwork.org/docs/lorawan/frequency-plans.html


var debug = true;

// LoRaWAN Over the Air Activation (OTAA)
// Copy these values from the Device Overview of the TTN console.
const deviceOTAAConfiguration = {
  'deviceEUI': '0000000000000000',
  'applicationEUI': '0000000000000000',
  'appKey': '00000000000000000000000000000000'
};


// Set up I2C for optional sensor. Using I2C2
I2C2.setup({ scl : B10, sda: B3, bitrate: 50000 });

Serial1.setup(57600, { tx:B6, rx:B7 });
var at = require("AT").connect(Serial1);
at.debug(debug);

var resetLine = B5;

at.registerLine('denied', () => {
  if (debug) console.log("Cannot join: There is some problem with the network or your settings.");
});

sendCommand = function (command, timeoutMs, waitForLine) {
  return new Promise((resolve, reject) => {

    var answer = "";
    at.cmd(command + "\r\n", timeoutMs || 1E3, function cb(response) {
      if (undefined === response || "invalid_param" === response ) {
        reject(response ? (command + ": " + response) : (command + ": TIMEOUT"));
      } else if (waitForLine ? (response.startsWith(waitForLine)) : ("ok" === response)) {
        resolve(waitForLine ? response : answer);
      } else {
        answer += (answer ? "\n" : "") + response;
        return cb;
      }
    });
  });
};

// Reset the RN2483 and then set the LoRaWAN configuration parameters that
// are necessary for Over the Air Activation (OTAA) of the device.
rn2483Setup = () => {
  return new Promise((resolve, reject) => {
    // Either do a hardware or software reset.
    // Depends if variable 'resetLine' is defined.
    if (resetLine) {
      resetLine.reset();
      resetLine.set();
      resolve();
    } else {
      sendCommand('sys reset')
        .then(() => {
          resolve();
      });
    }
  })
  .then(() => {
    return sendCommand('sys get ver', 1000, 'RN2483');
  })
  .then((version) => {
    if (debug) console.log('Version:', version);

    // This command will automatically reset the software LoRaWAN stack and initialize it
    // with the default parameters. Everything set prior to this command will lose its set value.
    return sendCommand('mac reset 868');
  })
  // Turn on adaptive data rate (https://www.thethingsnetwork.org/docs/lorawan/adaptive-data-rate.html)
  .then(() => sendCommand('mac set adr on'))
  .then(() => sendCommand('mac set appeui ' + deviceOTAAConfiguration.applicationEUI))
  .then(() => sendCommand('mac set deveui ' + deviceOTAAConfiguration.deviceEUI))
  .then(() => sendCommand('mac set appkey ' + deviceOTAAConfiguration.appKey));
};

// Send RN2483 to sleep (low power consuming) mode
rn2483SendToSleep = () => {
  if (debug) console.log('RN2483 go to sleep');
  at.cmd('sys sleep 86400000\r\n');
};

// Wake up RN2483 from sleep by creating a break condition on the serial port
// and sending a 0x55 character for auto-baud detection
rn2483WakeUp = () => {
  if (debug) console.log('RN2483 wake up');

  // Create Break condition on RN2483's UART by pulling TX to 0 for some time.
  Serial1.unsetup();
  B6.reset();

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 200);
  })
  .then(() => {
    Serial1.setup(57600, { tx:B6, rx:B7 });
    at.write('U'); // 0x55
  })
  .then(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  })
  .then(() => {
    // Just send "\r\n" to clear the receive buffer from any garbage characters
    return sendCommand('');
  })
  .catch(() => {
    // It is expected to get an "invalid_param" or TIMEOUT here
  });
};

periodicTask = () => {
  if (debug) console.log('Periodic task started.');
  rn2483WakeUp()
    .then(() => {
      if (debug) console.log('wake up finished');
    })
    .then(() => readSensor())
    .then((distanceAsHexString) => sendCommand('mac tx uncnf 1 ' + distanceAsHexString, 30000, 'mac_tx_ok'))
    .then(() => rn2483SendToSleep())
    .then(() => {
      if (debug) console.log('Periodic task done.');
    });
};

// Read distance using Ultrasonic sensor
readSensor = () => {

  // Use standard 7bit I2C addressing mode
  I2C2.writeTo(224 >> 1, 81);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 100);
  })
  .then(() => {
    var distanceArray = I2C2.readFrom(224 >> 1, 2);
    if (debug) console.log('distance', distanceArray);

    // Convert to hex string
    var distanceAsHexString = '';
    distanceArray.forEach((byte) => {
      distanceAsHexString += ('0' + (byte & 0xFF).toString(16)).slice(-2);
    });

    return distanceAsHexString;
  });
};

function onInit() {
  // Avoid that USART1 is used as serial console when USB is disconnected
  USB.setConsole(true);

  // Will light LED1 (red) whenever the device is not sleeping, allowing you to make sure it is sleeping as much as possible.
  // Comment out for maximum power saving
  setSleepIndicator(LED1);

  // Will light LED2 (green) when Espruino is not sleeping and is busy executing JavaScript
  // Comment out for maximum power saving
  setBusyIndicator(LED2);

  rn2483Setup()
    .then(() => {

      // Join the network using over-the-air activation.
      // May possibly take several minutes.
      return sendCommand('mac join otaa', 5 * 60000, 'accepted');
    })
    .then((result) => {
      if (debug) console.log('Result:', result);

      // Now that we are connected to the network, the RN2483 can go to sleep.
      rn2483SendToSleep();
    })
    .then((result) => {
      // Set up periodical execution of a worker task
      // Note that the RN2483's duty cycle enforcement limits you in how frequently you can execute the worker task.
      // It may happen that a message cannot be sent to the LoRaWAN if you send too frequently.
      // In the Things Network’s public community network, the "Fair Access Policy" limits the uplink airtime to 30 seconds per day (24 hours) per node.

      setInterval(periodicTask, 15 * 60 * 1000); 

      // Works only when not connected to USB
      // Details: https://www.espruino.com/Power+Consumption
      setDeepSleep(1);
    });
}
