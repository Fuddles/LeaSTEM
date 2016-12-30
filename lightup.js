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

    rpio.spiChipSelect(0);                  /* Use CE0 */
    rpio.spiSetCSPolarity(0, rpio.HIGH);    /* AT93C46 chip select is active-high */
    //rpio.spiSetDataMode(0);


    var startPadBytes = 8;    // 4;
    var endPadBytes   = 8;   // 32; // 4 + ceil(72 / 16)
    var nbLEDs        = 72;   // 72

    //var brightness = 7;
    var     txbuf    = Buffer.allocUnsafe( 4 );
    const   txbuf0   = Buffer.alloc(4, 0);
    const   txbuf1   = Buffer.alloc(4, 255);

    var     i, loop = 0;

    // init ALL WHITE
    // 4 x bytes filled with 0 to init
    for (i = 0; i < startPadBytes; i+=4) {
        rpio.spiWrite(txbuf0, 4);
    }
    for (i = 0; i < nbLEDs; i++) {
        rpio.spiWrite(txbuf1, 4);
    }
    for (i = 0; i < endPadBytes; i += 4) {
        //rpio.spiWrite(txbuf1, 4);
        rpio.spiWrite(txbuf0, 4);
    }
    rpio.msleep(3000);         // Sleep for n milliseconds


    // Loop
    while (true) {

        // 4 x bytes filled with 0 to init
        for (i = 0; i < startPadBytes; i+=4) {
            rpio.spiWrite(txbuf0, 4);
        }

/*
        i = 0;
        txbuf.writeUInt8( 0,      startPadBytes +     i * 4);
        txbuf.writeUInt8( 255,      startPadBytes + 1 + i * 4);
        txbuf.writeUInt8( 0,      startPadBytes + 2 + i * 4);
        txbuf.writeUInt8( 255,      startPadBytes + 3 + i * 4);

        i = 1;
        txbuf.writeUInt8( 0,    startPadBytes +     i * 4);
        txbuf.writeUInt8( 0,    startPadBytes + 1 + i * 4);
        txbuf.writeUInt8( 255,    startPadBytes + 2 + i * 4);
        txbuf.writeUInt8( 255,    startPadBytes + 3 + i * 4);
*/

        for (i = 0; i < 24; i++) {
            // 0xef, 0x0, 0x0, 0xff,    // red
            txbuf.writeUInt8( 255, 0);
            txbuf.writeUInt8( 0,   1);
            txbuf.writeUInt8( 0,   2);
            txbuf.writeUInt8( 255, 3);
            rpio.spiWrite(txbuf, 4);
        }

        for (i = 0; i < 24; i++) {
            // 0xef, 0x0, 0xff, 0x0,     // green
            txbuf.writeUInt8( 255, 0);
            txbuf.writeUInt8( 0,   1);
            txbuf.writeUInt8( 255, 2);
            txbuf.writeUInt8( 0,   3);
            rpio.spiWrite(txbuf, 4);
        }

        for (i = 0; i < 24; i++) {
            //0xef, 0xff, 0x0, 0x0,     // blue
            txbuf.writeUInt8( 255, 0);
            txbuf.writeUInt8( 255, 1);
            txbuf.writeUInt8( 0,   2);
            txbuf.writeUInt8( 0,   3);
            rpio.spiWrite(txbuf, 4);
        }

/*
        // 72 LEDs  (<0xE0+brightness> <blue> <green> <red>) brightness 0..31
        for (i = 0; i < 4*72; i += 4) {              // 4 * 72 + 4
            txbuf.writeUInt8( 0xef,                              i + startPadBytes );            // Half brightness
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 1 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 2 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 3 );
        }


        // 72 LEDs  (<0xE0+brightness> <blue> <green> <red>) brightness 0..31
        for (i = 0; i < 4*72; i += 4) {              // 4 * 72 + 4
            txbuf.writeUInt8( 255,                              i + startPadBytes );            // Half brightness
            txbuf.writeUInt8( 0xff, i + startPadBytes + 1 );
            txbuf.writeUInt8( 0x0, i + startPadBytes + 2 );
            txbuf.writeUInt8( 0xff, i + startPadBytes + 3 );
        }
*/


        // End frame: at least (n/2) bits of 1, where n = 72 LEDs. Here we send 8 bytes
        // 8 x bytes filled with 0 to init
        for (i = 0; i < endPadBytes; i += 4) {
            //rpio.spiWrite(txbuf1, 4);
            rpio.spiWrite(txbuf0, 4);
        }

        // Send to the LED strip
        // rpio.spiWrite(txbuf, txbuf.length);

        console.log( "\nSPI loop iteration #" + (++loop) + " \t Buffer = " );
        //console.log( txbuf );

        rpio.msleep(3000);         // Sleep for n milliseconds
    }

    rpio.spiEnd();
    console.log("End rpio SPI");
}
catch(e) {
    console.log("[begin lightup] exception:" + e.name + " -- " + e.message);
    console.log(e);
}




/**************************************************************************************

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
    var endPadBytes   = 12;   // 32; // 4 + ceil(72 / 16)
    var nbLEDs        = 2;    // 72

    //var brightness = 7;
    var txbuf    = Buffer.allocUnsafe( startPadBytes + 4 * nbLEDs + endPadBytes );
    var i, loop = 0;

//    while (true) {

        // 4 x bytes filled with 0 to init
        for (i = 0; i < startPadBytes; i++) {
            txbuf.writeUInt8( 0, i );
        }

        i = 0;
        txbuf.writeUInt8( 0,      startPadBytes +     i * 4);
        txbuf.writeUInt8( 255,      startPadBytes + 1 + i * 4);
        txbuf.writeUInt8( 0,      startPadBytes + 2 + i * 4);
        txbuf.writeUInt8( 255,      startPadBytes + 3 + i * 4);

        i = 1;
        txbuf.writeUInt8( 0,    startPadBytes +     i * 4);
        txbuf.writeUInt8( 0,    startPadBytes + 1 + i * 4);
        txbuf.writeUInt8( 255,    startPadBytes + 2 + i * 4);
        txbuf.writeUInt8( 255,    startPadBytes + 3 + i * 4);


/ *
        for (i = 0; i < 24; i++) {
            // 0xef, 0x0, 0x0, 0xff,    // red
            txbuf.writeUInt8( 255,    startPadBytes +     i * 4);
            txbuf.writeUInt8( 1,      startPadBytes + 1 + i * 4);
            txbuf.writeUInt8( 1,      startPadBytes + 2 + i * 4);
            txbuf.writeUInt8( 255,    startPadBytes + 3 + i * 4);
        }

        for (i = 0; i < 24; i++) {
            // 0xef, 0x0, 0xff, 0x0,     // green
            txbuf.writeUInt8( 255,    startPadBytes + 96  + i * 4);
            txbuf.writeUInt8( 1,      startPadBytes + 97  + i * 4);
            txbuf.writeUInt8( 255,    startPadBytes + 98  + i * 4);
            txbuf.writeUInt8( 1,      startPadBytes + 99  + i * 4);
        }

        for (i = 0; i < 24; i++) {
            //0xef, 0xff, 0x0, 0x0,     // blue
            txbuf.writeUInt8( 255,    startPadBytes + 192 + i * 4);
            txbuf.writeUInt8( 255,    startPadBytes + 193 + i * 4);
            txbuf.writeUInt8( 1,      startPadBytes + 194 + i * 4);
            txbuf.writeUInt8( 1,      startPadBytes + 195 + i * 4);
        }
* /

/ *
        // 72 LEDs  (<0xE0+brightness> <blue> <green> <red>) brightness 0..31
        for (i = 0; i < 4*72; i += 4) {              // 4 * 72 + 4
            txbuf.writeUInt8( 0xef,                              i + startPadBytes );            // Half brightness
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 1 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 2 );
            txbuf.writeUInt8( Math.floor( 256 * Math.random() ), i + startPadBytes + 3 );
        }


        // 72 LEDs  (<0xE0+brightness> <blue> <green> <red>) brightness 0..31
        for (i = 0; i < 4*72; i += 4) {              // 4 * 72 + 4
            txbuf.writeUInt8( 255,                              i + startPadBytes );            // Half brightness
            txbuf.writeUInt8( 0xff, i + startPadBytes + 1 );
            txbuf.writeUInt8( 0x0, i + startPadBytes + 2 );
            txbuf.writeUInt8( 0xff, i + startPadBytes + 3 );
        }
* /


        // End frame: at least (n/2) bits of 1, where n = 72 LEDs. Here we send 8 bytes
        // 8 x bytes filled with 0 to init

        for (i = 0; i < endPadBytes; i++) {
            txbuf.writeUInt8( 0, startPadBytes + 4 * nbLEDs + i );
        }

        // Send to the LED strip
        rpio.spiWrite(txbuf, txbuf.length);

        console.log( "\nSPI loop iteration #" + (++loop) + " \t Buffer = " );
        console.log( txbuf );

        rpio.msleep(1000);         // Sleep for n milliseconds
//    }


/ *
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
* /

// FIXME
//    rpio.spiEnd();

    console.log("End rpio SPI");
}
catch(e) {
    console.log("[begin lightup] exception:" + e.name + " -- " + e.message);
    console.log(e);
}

********/
