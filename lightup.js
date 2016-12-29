// Light up the LED strip. 72 LEDs

try {

    console.log("Begin lightup");

    //var debug = require('debug')('lightup');
    var rpio = require('rpio');

    // We begin!
    console.log("Begin rpio SPI");

    rpio.init({
          gpiomem: false,          // Use /dev/gpiomem --> FALSE to use SPI
          mapping: 'physical',     // Use the P1-P40 numbering scheme
    });

    rpio.spiBegin();

    // TODO
    //rpio.spiSetClockDivider(4); 	/* divider should be 4 or 8 max to have high-speed display */
    rpio.spiSetClockDivider(128); 	/* divider should be 4 or 8 max to have high-speed display */

    var txbuf = Buffer.allocUnsafe( 4 + 72*4 + 8 );
    var i, loop = 0;

    while (true) {

        // 4 x bytes filled with 0 to init
        for (i = 0; i < 4; i++) {
            txbuf.writeUInt8( 0x0, i );
        }
        // 72 LEDs  (<0xE0+brightness> <blue> <green> <red>) brightness 0..31
        for (i = 4; i < 292; i += 4) {              // 4 * 72 + 4
            txbuf.writeUInt8( 0xef, i );            // Half brightness
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + 1 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + 2 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + 3 );
        }
        // End frame: at least (n/2) bits of 1, where n = 72 LEDs. Here we send 8 bytes
        // 8 x bytes filled with 0 to init
        for (i = 292; i < 300; i++) {
            txbuf.writeUInt8( 0xff, i );
        }

        // Send to the LED strip
        rpio.spiWrite(txbuf, txbuf.length);

        console.log( "\nSPI loop iteration #" + (++loop) + " \t Buffer = " );
        console.log( txbuf );

        rpio.msleep(2000);         // Sleep for n milliseconds
    }


/*
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
*/

    rpio.spiEnd();

    console.log("End rpio SPI");
}
catch(e) {
    console.log("[begin lightup] exception:" + e.name + " -- " + e.message);
    console.log(e);
}
