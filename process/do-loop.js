// Loop and control led lighting according to angle and current photo
//
// Lea, Jan 2017

// NOTE: global.bnoValues is an array containing (never null in here):
//         [0]     High-Res Timestamp from process.hrtime() [seconds, nanoseconds]
//         [1]     Heading
//         [2]     Roll
//         [3]     Pitch
//         [4]     gyroX
//         [5]     gyroY
//         [6]     gyroZ
//         [7]     magX
//         [8]     magY
//         [9]     magZ


const setCurrentPhotoPromise = require('./image-functions').setCurrentPhotoPromise;
const getCurrentPhoto        = require('./image-functions').getCurrentPhoto;
const getPixelsPromise       = require('./image-functions').getPixelsPromise;
const NUM_LEDS               = require("./image-functions").NUM_LEDS;
const WHITE_ARRAY            = require('./led').WHITE_ARRAY;
const ledLightUp             = require('./led').ledLightUp;

const ANGLE_FIXED_CORRECTION = 90;

// ----------- TESTS LEA -----------
//var LEA_DEBUG = true;
var LEA_DEBUG = false;
// ---------------------------------



/**
 * Main initialization
 */
function initLoop() {

    // ----------- TESTS LEA -----------
    if (LEA_DEBUG) {
        require("./test/lightup.js");
        return;
    }
    // ---------------------------------


    setCurrentPhotoPromise( process.env.CURRENT_PHOTO_FILENAME )
    .then( fname => {

        // --- Display white strip;
        ledLightUp( WHITE_ARRAY );

        // --- Launch interval func to refresh LED display
        doLedDisplayLoop();
        return;
    })
    .catch( err => {
        console.error("ERROR in initLoop: err =");
        console.error( err );
    });
}


/**
 *  For a given image (currentPhoto) and a given angle, display the LED corresponding colors
 */
function doLedDisplayLoop() {

    let angle           = (ANGLE_FIXED_CORRECTION - global.bnoValues[1] + 360) % 360;
    let angularVelocity = global.bnoValues[6];
    let hrTimeDiff      = process.hrtime( global.bnoValues[0] );            // Diff with time of measurement

    // Use angular velocity and elapsed time to improve the currentAngle.
    //  We should always be under 1 sec!
    let currentAngle    = angle;
    let angleDiff       = hrTimeDiff[1] * 1.0e-9 * angularVelocity;
    if ( Math.abs(angleDiff) >= 0.01 ) {
        currentAngle    = (angle + angleDiff + 360 ) % 360;
        console.log( "DIFF angle with velocity:  angle="+ angle +", angleDiff="+ angleDiff
            + ", \t angularVelocity="+ angularVelocity +" deg/s, hrTimeDiff="+ hrTimeDiff );
    }

    // TODO: check currentAngle in high rotation speed condition!
    //_doLoop( angle, getCurrentPhoto() );
    _doLoop( currentAngle, getCurrentPhoto() );

    // Loop over within _doLoop when lighting-up is complete
}


/** Internal */
function _doLoop( angle, photoFilename ) {

    getPixelsPromise( angle, photoFilename )
    .then( ledColorArray => {

        if ( ledColorArray && ledColorArray.length == NUM_LEDS ) {

            // Display the colors on the LEDs
            ledLightUp( ledColorArray );
        }

        // Loop
        setTimeout( doLedDisplayLoop, 0 );      // Variant: 1 ms later

    })
    .catch( err => {
        console.error("ERROR in _doLoop: err =");
        console.error( err );
    });
}


module.exports.initLoop  = initLoop;
