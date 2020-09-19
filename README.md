# espruino-pico-rn2483-ttn-basic
Simple LoRaWAN node targeted to [The Things Network (TTN)](https://www.thethingsnetwork.org/) 
using [Espruino Pico](http://www.espruino.com/Pico)
and Microchip [RN2483 LoRa Technology Module](https://www.microchip.com/wwwproducts/en/RN2483).
  
  There is a focus on low power consumption, targeting more than one year of operation on a single battery.

## Motivation
* In many cases, LoRaWAN nodes are deployed in remote places without
  a static power supply. So both hardware and software need to be
  designed in a way that allows battery operation.
* With battery operation, operation of at least 1 year should be
  technically feasible these days, given that sending sensor values
  only a few times per day is good enough for the given use case.
* The Espruino Pico already has some [operational modes for power saving](https://www.espruino.com/Power+Consumption),
  the goal is to find out how these modes can be used.
* Also the RN2483 can be sent to sleep in order to minimize power consumption.
  The goal is how to find out how to send this module to sleep and wake it up
  again, and what implications this has to the current connection to TTN. 

Last but not least ...

* Be a cool guy and [program a microcontroller with JavaScript](https://www.espruino.com/).

## Wiring
I use a RN2483A/RN2903A breakout board that I ordered for about €30 at Tindie:
https://www.tindie.com/products/DrAzzy/lorawan-rn2483rn2903-breakout-board-assembled/

**Level Shifter Option:** As the Espruino Pico already operates at 3.3V, there
should be no need for a level shifter. However, if you like to play around
with this module by simply attaching a (FTDI) Serial-to-UART cable which 
has 5v levels, then you probably want to have a level shifter and a voltage
regulator at hand.

[Espruino Pico Pinout](http://www.espruino.com/Pico)
[RN2483 Breakout Board Pinout)[https://www.tindie.com/products/drazzy/lorawan-rn2483rn2903-breakout-board-assembled/]

| Espruino Pico  | RN2483 | Remark |
|---|---|---|
| GND |   | **Only when not powered by USB: Connect to battery GND** |
| BAT_IN  |   | **Only when not powered by USB: Connect to battery VBAT** |
| GND | GND  | |
| 3.3 | 3V3  | Connected to the on-board Voltage regulator of the Pico |
| B7 USART1RX | Tx  |  |
| B6 USART1TX | Rx  |  |
| B3 | RST |  |

## Preparation in TTN Console
https://console.thethingsnetwork.org/
You first need to create an application in [TTN console](https://console.thethingsnetwork.org/), and create a device within this application.

Select OTAA (Over the Air Activation) as *Activation Mode*

After creation of the device, copy and paste the values for *Device EUI*, 
*Application EUI* and *App Key* to the code:

    // LoRaWAN Over the Air Activation (OTAA)
    // Copy these values from the Device Overview of the TTN console.
    const deviceOTAAConfiguration = {
      'deviceEUI': '0000000000000000',
      'applicationEUI': '0000000000000000',
      'appKey': '00000000000000000000000000000000'
    };

## Transfer code to Espruino Pico and run it
I won't explain here how you work in general with Espruino products, you already should be familiar with that or make yourself familiar by other means than this 
project.

* Connect the Espruino Pico via USB, 
* use the [Espruino Web IDE](https://www.espruino.com/Web+IDE) to transfer the code (I still use the native version for Windows)
* Run the code by entering *onInit();* on the Pico

Note that the Pico won't go into *stop* mode until connected to USB. You need to
connect a battery (or another power source) to try that out.

https://www.espruino.com/Power+Consumption

## Example output
     ____                 _
    |  __|___ ___ ___ _ _|_|___ ___
    |  __|_ -| . |  _| | | |   | . |
    |____|___|  _|_| |___|_|_|_|___|
             |_| espruino.com
     2v06 (c) 2019 G.Williams
    >
    >onInit();
    =undefined
    ["sys get ver\r\n"
    ] "R"
    ] "N2483 1.0.5 Oct"
    ] " 31 2018 15:06:5"
    ] "2\r\n"
    Version: RN2483 1.0.5 Oct 31 2018 15:06:52
    ["mac reset 868\r\n"
    ] "o"
    ] "k\r\n"
    ["mac set adr on\r\n"
    ] "o"
    ] "k\r\n"
    ["mac set appeui 70B3D57EXXXXXXXX\r\n"
    ] "o"
    ] "k\r\n"
    ["mac set deveui 00022CBFXXXXXXXX\r\n"
    ] "o"
    ] "k\r\n"
    ["mac set appkey 625C109CA95ADA37E9D0EA64XXXXXXXX\r\n"
    ] "o"
    ] "k\r\n"
    ["mac join otaa\r\n"
    ] "o"
    ] "k\r\n"
    ] "a"
    ] "ccepted\r\n"
    Result: accepted
    RN2483 go to sleep
    ["sys sleep 86400000\r\n"
    RN2483 sent to sleep
    Periodic task started.
    RN2483 wake up
    ] "\u0000"
    ] "ok\r\n"
    ["\r\n"
    ] "inv"
    ] "alid_param\r\n"
    wake up finished
    ["mac tx uncnf 1 42\r\n"
    ] "o"
    ] "k\r\n"
    ] "m"
    ] "ac_tx_ok\r\n"
    RN2483 go to sleep
    ["sys sleep 86400000\r\n"
    Periodic task done.
    > 
