// Functions to light the led strip up
// Lea, Jan 2017


const rpio = require('rpio');

// Number of LEDs on the strip
const NUM_LEDS    = require("./image-functions").NUM_LEDS;
// Padding of zeros for APA102C
const START_PAD_BYTES = 8;      // 4 needed at least
const END_PAD_BYTES   = 8;      // 4 + ceil(72 / 16)
// Brightness
const BRIGHTNESS      = 7;


// --------------- Init Raspberry Pi GPIO ----------------------

rpio.init({
      gpiomem: false,          // Use /dev/gpiomem --> FALSE to use SPI
      mapping: 'physical',     // Use the P1-P40 numbering scheme
});
rpio.spiBegin();
//rpio.spiSetClockDivider(4); 	// divider should be 4 or 8 max to have high-speed display, but flickers --> 64 is good
//rpio.spiSetClockDivider(64);
rpio.spiSetClockDivider(32);
rpio.spiSetDataMode(0);


// TODO: Call it!
/** Close SPI properly */
function rpioEndSpi() {
    console.log("End rpio SPI");
    rpio.spiEnd();
}



// --------------- DISPLAY functions ----------------------

const   TXBUF0   = Buffer.alloc(4, 0);

/**
 * Light up leds according to array parameter
 * @param {Array} colors is a two dimensional array colors[ledIndex][channel]  3 channels RGB, no A!
 */
function ledLightUp( colors ) {

    if ( colors.length < NUM_LEDS ) {
        throw new Error("Colors Array not long enough in ledLightUp: length=" + colors.length);
    }

    let txbuf = Buffer.allocUnsafe( 4 );
    let i;

    // 4 x bytes filled with 0 to init
    for ( i = 0; i < START_PAD_BYTES; i += 4 ) {
        rpio.spiWrite(TXBUF0, 4);
    }

    for ( i = 0; i < NUM_LEDS; i++) {
        // brightness (0..31), blue, green, red
        txbuf.writeUInt8( 0xe0 | BRIGHTNESS, 0 );
        txbuf.writeUInt8( colors[i][2],      1 );
        txbuf.writeUInt8( colors[i][1],      2 );
        txbuf.writeUInt8( colors[i][0],      3 );
        rpio.spiWrite(txbuf, 4);
    }

    // 8 x bytes filled with 0 to finish
    for ( i = 0; i < END_PAD_BYTES; i += 4) {
        rpio.spiWrite(TXBUF0, 4);
    }
    return;
}


/** Array of white color */
function _getWhiteLedArray() {
    let whiteArray = new Array( NUM_LEDS );
    for (let i = 0; i < NUM_LEDS; i++) {
        whiteArray[i] = [ 255, 255, 255 ];
    }
    return whiteArray;
}


module.exports.WHITE_ARRAY = _getWhiteLedArray();
module.exports.rpioEndSpi  = rpioEndSpi;
module.exports.ledLightUp  = ledLightUp;
