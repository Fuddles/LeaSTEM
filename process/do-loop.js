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

const regression             = require('regression');

const setCurrentPhotoPromise = require('./image-functions').setCurrentPhotoPromise;
const getCurrentPhoto        = require('./image-functions').getCurrentPhoto;
const getPixelsPromise       = require('./image-functions').getPixelsPromise;
const NUM_LEDS               = require("./image-functions").NUM_LEDS;
const WHITE_ARRAY            = require('./led').WHITE_ARRAY;
const ledLightUp             = require('./led').ledLightUp;

const ANGLE_FIXED_CORRECTION = 90;

// --- Magnet must be attached at the bottom of the reference frame. There we should have angle = 180 deg
//      We use magZ (global.bnoValues[9]) maximum to infer where the absolute bottom is and correct drift
var   angleCorrectionFromBottomMagnet = 0;
var   previousDataPoints = new Array();         // array of [hrtime, currentAngle, magZ]. We keep the last 4 values.


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

    let nowHrTime       = process.hrtime();
    let hrTimeDiff      = process.hrtime( global.bnoValues[0] );                // Diff with time of measurement
    let angularVelocity = global.bnoValues[6];
    let angle           = (ANGLE_FIXED_CORRECTION - global.bnoValues[1] + angleCorrectionFromBottomMagnet + 720) % 360;

    // Use angular velocity and elapsed time to improve the currentAngle.
    //  We should always be under 1 sec!
    let currentAngle    = angle;
    let angleDiff       = hrTimeDiff[1] * 1.0e-9 * angularVelocity;
    if ( Math.abs(angleDiff) >= 0.1 ) {
        currentAngle    = (angle + angleDiff + 360 ) % 360;
        console.log( "DIFF angle with velocity:  angle="+ angle +", angleDiff="+ angleDiff
            + ", \t angularVelocity="+ angularVelocity +" deg/s, hrTimeDiff="+ hrTimeDiff );
    }

    // Keep last 4 data points and then correct the angle by detecting the bottom (peak of magZ)
    let newLen = previousDataPoints.unshift( [ nowHrTime, currentAngle, global.bnoValues[9] ] );    // Add as element [0] of the array
    if ( newLen > 3 ) {
        if ( previousDataPoints[1][2] - previousDataPoints[0][2] > 0.1 || previousDataPoints[2][2] - previousDataPoints[0][2] > 1 ) {
            // We have passed magZ maximum! Compute angleCorrectionFromBottomMagnet
            _computeAngleCorrectionFromBottomMagnet();
            console.log( "INFO in do-loop: new value computed for angleCorrectionFromBottomMagnet = "+ angleCorrectionFromBottomMagnet
                         + ", when currentAngle = " + currentAngle );
        }
        else {
            previousDataPoints.slice(0, 3);
        }
    }

    // currentAngle is supposed to correct angle in high rotation speed condition!
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



/** Internal: diff from previousDataPoints[3][0] */
function _diffHrTime( hrTim) {

    let ns = hrTim[1] - previousDataPoints[3][0][1];
    let s  = hrTim[0] - previousDataPoints[3][0][0];
    return s + ns * 1.0e-9;
}


/** Internal: compute values at bottom through quadratic regression on magZ and currentAngle */
function _computeAngleCorrectionFromBottomMagnet() {

    let data = [ [ 0,                                       previousDataPoints[3][2] ],
                 [ _diffHrTime(previousDataPoints[2][0]),   previousDataPoints[2][2] ],
                 [ _diffHrTime(previousDataPoints[1][0]),   previousDataPoints[1][2] ],
                 [ _diffHrTime(previousDataPoints[0][0]),   previousDataPoints[0][2] ] ];
    let regrMagZ = regression('polynomial', data, 2);
    // magZ = f(t) = regrMagZ[2] * t^2 + regrMagZ[1] * t + regrMagZ[0]

    // --- Now find the Time (in seconds) where magZ is maximum, ie when derivative is 0
    //      2 * regrMagZ[2] * t' + regrMagZ[1] = 0
    let timMagZMax = -0.5 * regrMagZ[1] / regrMagZ[2];
    if ( isNaN(timMagZMax) || timMagZMax < 0 || timMagZMax > data[3][0] ) {        // assert timMagZMax <= data[1][0]
        console.log("\nWARNING in do-loop > _computeAngleCorrectionFromBottomMagnet: IGNORE as timMagZMax="+timMagZMax+" should be 0 <= T <= data[3][0]="+data[3][0]);
        return;
    }

    // --- From there we can interpolate the currentAngle value at that time
    let angData = [ [ 0,            previousDataPoints[3][1] ],
                    [ timMagZMax,   null ],      // null will be filled using the trend, by regression-js
                    [ data[1][0],   previousDataPoints[2][1] ],
                    [ data[2][0],   previousDataPoints[1][1] ],
                    [ data[3][0],   previousDataPoints[0][1] ] ];
    let regrCurrentAngle = regression('polynomial', angData, 2);

    // currentAngleAtMax should be 180, so we auto-correct
    let currentAngleAtMax = angData[1][1];
    console.log("INFO in do-loop > _computeAngleCorrectionFromBottomMagnet: at time="+timMagZMax+", currentAngleAtMax estimated at "+currentAngleAtMax);
    angleCorrectionFromBottomMagnet = (540 - currentAngleAtMax) % 360;    // 180 + 360

    // Empties the data point history as we have found the bottom
    previousDataPoints = new Array();
    return;
}


module.exports.initLoop  = initLoop;
