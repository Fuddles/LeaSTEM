try {

  // Light up the LED strip. 72 LEDs

  console.log("Begin lightup");

  //var debug = require('debug')('lightup');

  var rpio = require('rpio');

  // We begin!

  console.log("Begin rpio SPI");

  rpio.spiBegin();

  // TODO
  //rpio.spiSetClockDivider(4); 	// divider should be 4 or 8 max to have high-speed display 
  rpio.spiSetClockDivider(128); 	// divider should be 4 or 8 max to have high-speed display

  var txbuf = new Buffer([0x0, 0x0, 0x0, 0x0,

    // Couleur de la 1e LED
    0xff, 0x0, 0x0, 0xff,
    // Couleur de la 2e LED
    0xff, 0x0, 0xff, 0x0,
    // Couleur de la 3e LED
    0xff, 0xff, 0x0, 0x0,
    // Couleur de la 4e LED
    0xff, 0xff, 0xff, 0xff,


     0xff, 0xff, 0xff, 0xff, 0xff
  ]);

  rpio.spiWrite(txbuf, txbuf.length);

  rpio.spiEnd();

  console.log("End rpio SPI");
} catch(e) {
  console.log("[begin lightup] exception:" + e.name + " -- " + e.message);
  console.log(e);
}
