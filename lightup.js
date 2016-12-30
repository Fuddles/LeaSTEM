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
    //rpio.spiSetClockDivider(4); 	// divider should be 4 or 8 max to have high-speed display
    rpio.spiSetClockDivider(64); 	// divider should be 4 or 8 max to have high-speed display

    var startPadBytes = 4;    // 4;
    var endPadBytes   = 9;   // 32; // 4 + ceil(72 / 16)
    var brightness = 7;
    var txbuf    = Buffer.allocUnsafe( startPadBytes + 72*4 + endPadBytes );
    var i, loop = 0;

    while (true) {

        // 4 x bytes filled with 0 to init
        for (i = 0; i < startPadBytes; i++) {
            txbuf.writeUInt8( 0x0, i );
        }

/*
        for (i = 0; i < 24; i++) {
            // 0xef, 0x0, 0x0, 0xff,    // red
            txbuf.writeUInt8( 0xe0 + brightness,    startPadBytes +     i * 4);
            txbuf.writeUInt8( 0x0,                  startPadBytes + 1 + i * 4);
            txbuf.writeUInt8( 0x0,                  startPadBytes + 2 + i * 4);
            txbuf.writeUInt8( 0xff,                 startPadBytes + 3 + i * 4);
        }

        for (i = 0; i < 24; i++) {
            // 0xef, 0x0, 0xff, 0x0,     // green
            txbuf.writeUInt8( 0xe0 + brightness,    startPadBytes + 96  + i * 4);
            txbuf.writeUInt8( 0x0,                  startPadBytes + 97  + i * 4);
            txbuf.writeUInt8( 0xff,                 startPadBytes + 98  + i * 4);
            txbuf.writeUInt8( 0x0,                  startPadBytes + 99  + i * 4);
        }

        for (i = 0; i < 24; i++) {
            //0xef, 0xff, 0x0, 0x0,     // blue
            txbuf.writeUInt8( 0xe0 + brightness,    startPadBytes + 192 + i * 4);
            txbuf.writeUInt8( 0xff,                 startPadBytes + 193 + i * 4);
            txbuf.writeUInt8( 0x0,                  startPadBytes + 194 + i * 4);
            txbuf.writeUInt8( 0x0,                  startPadBytes + 195 + i * 4);
        }
*/

        // 72 LEDs  (<0xE0+brightness> <blue> <green> <red>) brightness 0..31
        for (i = 0; i < 4*72; i += 4) {              // 4 * 72 + 4
            txbuf.writeUInt8( 0xef,                              i + startPadBytes );            // Half brightness
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 1 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 2 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 3 );
        }

        // End frame: at least (n/2) bits of 1, where n = 72 LEDs. Here we send 8 bytes
        // 8 x bytes filled with 0 to init

        for (i = 0; i < endPadBytes; i++) {
            txbuf.writeUInt8( 0x00, startPadBytes + 4*72 + i );
        }

        // Send to the LED strip
        rpio.spiWrite(txbuf, txbuf.length);

        console.log( "\nSPI loop iteration #" + (++loop) + " \t Buffer = " );
        console.log( txbuf );

        rpio.msleep(1);         // Sleep for n milliseconds
    }


/*
    var txbuf = new Buffer([0x0, 0x0, 0x0, 0x0,

      // Couleur de la 1e LED
      0xef, 0x0, 0x0, 0xff,     // red
      // Couleur de la 2e LED
      0xef, 0x0, 0xff, 0x0,     // green
      // Couleur de la 3e LED
      0xef, 0xff, 0x0, 0x0,     // blue
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
