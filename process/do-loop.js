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
//        [10]     qa
//    [11..13]     qb, qc, qd
// WARNING: [1]..[13] are STRINGs!

const regression             = require('regression');

const setCurrentPhotoPromise = require('./image-functions').setCurrentPhotoPromise;
const getCurrentPhoto        = require('./image-functions').getCurrentPhoto;
const getPixelsPromise       = require('./image-functions').getPixelsPromise;
const NUM_LEDS               = require("./image-functions").NUM_LEDS;
const WHITE_ARRAY            = require('./led').WHITE_ARRAY;
const ledLightUp             = require('./led').ledLightUp;

const ANGLE_FIXED_CORRECTION = 90;
const SENSOR_READ_DELAY_IN_NANOS = 1000000;           // Delay to add to hrTimeDiff to account for sensor read delay

// --- Magnet must be attached at the bottom of the reference frame. There we should have angle = 180 deg
//      We use magZ (global.bnoValues[9]) maximum to infer where the absolute bottom is and correct drift
var   averageDisplayTimeInNanos       = 1500000;      // Around 1500 microseconds on average
var   angleCorrectionFromBottomMagnet = 0;
var   angleCorrectionFromQuaternion   = 0;
//
var   magZMaxValue                    = -10000;
var   magYMinValue                    = 10000;
var   qaZeroSensorAnglePrevValue          = -999;         // Don't change init value!
var   previousDataPointsMag           = null;         // array of [hrtime, sensorAngle, magZ, magY, angVeloc]. We keep the last 4 values.
var   previousDataPointsQa            = null;         // array of [hrtime, sensorAngle, qa]. We keep the last 3 values.
var   lastHrTimeAngleCorrected        = null;

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
    let angularVelocity = Number.parseFloat( global.bnoValues[6] ) * 180 / Math.PI; // Tested good!
    let sensorAngle     = Number.parseFloat( global.bnoValues[1] );
    let angle           = (ANGLE_FIXED_CORRECTION - (sensorAngle + angleCorrectionFromBottomMagnet + angleCorrectionFromQuaternion) + 720) % 360;

    // --- Use angular velocity and elapsed time to improve the currentAngle.
    //      We should always be under 1 sec!
    let currentAngle    = angle;
    let angleDiff       = (hrTimeDiff[1] + averageDisplayTimeInNanos + SENSOR_READ_DELAY_IN_NANOS) * 1.0e-9 * angularVelocity;

    if ( Math.abs(angleDiff) >= 0.1 ) {
        currentAngle    = (angle + angleDiff + 360 ) % 360;
        // if ( Math.abs(angleDiff) >= 10 ) {
        //     console.log( "DIFF angle \t hrTimeDiff= "+ Math.floor(hrTimeDiff[0] * 1000 + hrTimeDiff[1]* 1e-6)
        //     + "ms, with velocity: \t angle= "+ angle +" \t angleDiff= "+ angleDiff
        //     + "\n\t\t angularVelocity= "+ angularVelocity +" deg/s" );
        // }
    }

    // --- Keep last 5 data points and then correct the angle by detecting the zero crossing of qa
    let qa   = Number.parseFloat( global.bnoValues[10] );            // Quaternion scalar
    _keeppreviousDataPointsQaToComputeAngleCorrectionFromQuaternion(
            nowHrTime, sensorAngle, qa, angularVelocity );

    // --- Keep last 5 data points and then correct the angle by detecting the bottom (peak of magZ)
    //      This is also a min of magY
    let magZ = Number.parseFloat( global.bnoValues[9] );
    let magY = Number.parseFloat( global.bnoValues[8] );
    _keeppreviousDataPointsMagAndFindMaxMagZToComputeAngleCorrectionFromBottomMagnet(
            nowHrTime, sensorAngle, magZ, magY, angularVelocity);

    // --- currentAngle is supposed to correct angle in high rotation speed condition!
    //_doLoop( angle, getCurrentPhoto() );
    _doLoop( currentAngle, getCurrentPhoto(), nowHrTime );

    // Loop over within _doLoop when lighting-up is complete
}


/** Internal */
function _doLoop( angle, photoFilename, nowHrTime ) {

    getPixelsPromise( angle, photoFilename )
    .then( ledColorArray => {

        if ( ledColorArray && ledColorArray.length == NUM_LEDS ) {

            // Display the colors on the LEDs
            ledLightUp( ledColorArray );

            // Compute average display time to anticipate angle better
            let elapsedTime = process.hrtime(nowHrTime);
            averageDisplayTimeInNanos = Math.floor( (4 * averageDisplayTimeInNanos + elapsedTime[1]) / 5 );     // weighted average to smooth
            //console.log( "DEBUG: averageDisplayTimeInNanos= "+ Math.floor( averageDisplayTimeInNanos / 1000)
            //    + " \t DIFF with elapsed-time is "+ Math.floor( Math.abs(averageDisplayTimeInNanos - elapsedTime[1]) / 1000) +" microseconds =========================" );
        }

        // Loop
        setTimeout( doLedDisplayLoop, 0 );   // Loop asap, but without blocking the RPi event loop

    })
    .catch( err => {
        console.error("ERROR in _doLoop: err =");
        console.error( err );
    });
}




/*
 █████  ███    ██  ██████  ██      ███████      ██████  ██████  ██████  ██████  ███████  ██████ ████████ ██  ██████  ███    ██ ███████
██   ██ ████   ██ ██       ██      ██          ██      ██    ██ ██   ██ ██   ██ ██      ██         ██    ██ ██    ██ ████   ██ ██
███████ ██ ██  ██ ██   ███ ██      █████       ██      ██    ██ ██████  ██████  █████   ██         ██    ██ ██    ██ ██ ██  ██ ███████
██   ██ ██  ██ ██ ██    ██ ██      ██          ██      ██    ██ ██   ██ ██   ██ ██      ██         ██    ██ ██    ██ ██  ██ ██      ██
██   ██ ██   ████  ██████  ███████ ███████      ██████  ██████  ██   ██ ██   ██ ███████  ██████    ██    ██  ██████  ██   ████ ███████
*/






/** Internal: maintain previousDataPointsQa, look for a zero-crossing in qa,
 *    and when found, computeAngleCorrection
 */
function _keeppreviousDataPointsQaToComputeAngleCorrectionFromQuaternion( nowHrTime, sensorAngle, qa, angularVelocity ) {

    if ( !previousDataPointsQa ) {
        previousDataPointsQa = [ [ nowHrTime, sensorAngle, qa, angularVelocity ] ];
        return;
    }

    // First we check we do have a new value (magnetometer measures are not as fast as this loop)
    if ( qa === previousDataPointsQa[0][2] ) {
        return;
    }
    let newLen = previousDataPointsQa.unshift( [ nowHrTime, sensorAngle, qa, angularVelocity ] );    // Add as element [0] of the array
    if ( newLen <= 3 ) {
        return;
    }

    // Conditions for finding a zero-crossing:
    //   -- some movement ( angularVelocity not null), steadily in the same direction
    //          (angularVelocity > 0 or < 0 on all values)
    //   -- negative on one side and positive on the other
    if ( Math.abs( angularVelocity ) > 1.0 ) {

        // Test constant sign of angularVelocity
        let isAngVelocSignConst = (   previousDataPointsQa[0][3] > 0 && previousDataPointsQa[1][3] > 0
                                   && previousDataPointsQa[2][3] > 0 && previousDataPointsQa[3][3] > 0 )
                               || (   previousDataPointsQa[0][3] < 0 && previousDataPointsQa[1][3] < 0
                                   && previousDataPointsQa[2][3] < 0 && previousDataPointsQa[3][3] < 0 );
        if ( isAngVelocSignConst ) {
            // zero-crossing on qa?
            if ( ( previousDataPointsQa[1][2] < 0 && previousDataPointsQa[2][2] >= 0
                && previousDataPointsQa[0][2] < previousDataPointsQa[1][2]
                && previousDataPointsQa[2][2] < previousDataPointsQa[3][2] )
              || ( previousDataPointsQa[1][2] > 0 && previousDataPointsQa[2][2] <= 0
                && previousDataPointsQa[0][2] > previousDataPointsQa[1][2]
                && previousDataPointsQa[2][2] > previousDataPointsQa[3][2] )
            ) {
                // --- We have passed zero-crossing for qa! Compute angleCorrectionFromQuaternion
                _computeAngleCorrectionFromQuaternion();
                return;
            }
        }
    }

    // Otherwise prune to store only last four (3 + current added)
    previousDataPointsQa.slice(0, 3);
    return;
}



/** Internal: compute sensorAngle when qa crosses 0. Then compute diff with actual and compensate */
function _computeAngleCorrectionFromQuaternion() {

    // x: qa, y: sensorAngle
    let data = [ [ previousDataPointsQa[0][2],   previousDataPointsQa[0][1] ],
                 [ previousDataPointsQa[1][2],   previousDataPointsQa[1][1] ],
                 [ previousDataPointsQa[2][2],   previousDataPointsQa[2][1] ],
                 [ previousDataPointsQa[3][2],   previousDataPointsQa[3][1] ] ];
    let regrQa = regression('linear', data);
    // sensorAngle = f(qa) = regrQa[0] * qa + regrQa[1]
    //console.log( regrQa );

    // --- From there we can interpolate the sensorAngle value at qa zero
    let sensorAngleAtQaZero = regrQa.equation[1];
    // First time?
    if (qaZeroSensorAnglePrevValue === -999) {
        qaZeroSensorAnglePrevValue = sensorAngleAtQaZero;
        return;
    }

    let oldAngleCorrect           = angleCorrectionFromQuaternion;
    // Auto-correct!    // FIXME: should we average??
    angleCorrectionFromQuaternion = qaZeroSensorAnglePrevValue - sensorAngleAtQaZero;
    let correctionAbsDiff         = Math.abs( oldAngleCorrect - angleCorrectionFromQuaternion );
    // Save previous value for next loop
    qaZeroSensorAnglePrevValue    = sensorAngleAtQaZero;

    console.log("\nQA-CORRECTION: angleCorrectionQa= "+ angleCorrectionFromQuaternion);
    if ( correctionAbsDiff > 5.0 ) {
        console.log("@@@@@@*******++++++++ BIG DIFF! ++++++********@@@@@@@@");
        console.log(" \t From "+oldAngleCorrect+" to \t "+angleCorrectionFromQuaternion);
    }

    // Empties the data point history as we have found the zero-crossing
    previousDataPointsQa = null;
    return;
}







/*
███    ███  █████   ██████
████  ████ ██   ██ ██
██ ████ ██ ███████ ██   ███
██  ██  ██ ██   ██ ██    ██
██      ██ ██   ██  ██████
*/




/** Internal: maintain previousDataPointsMag, look for a maximum in magZ,
 *    and when found, computeAngleCorrection (magnet supposed to be at bottom => sensor angle 90 deg)
 */
function _keeppreviousDataPointsMagAndFindMaxMagZToComputeAngleCorrectionFromBottomMagnet(
        nowHrTime, sensorAngle, magZ, magY, angularVelocity) {

    if ( !previousDataPointsMag ) {
        previousDataPointsMag = [ [ nowHrTime, sensorAngle, magZ, magY, angularVelocity] ];
        return;
    }

    // First we check we do have a new value (magnetometer measures are not as fast as this loop)
    if ( magZ === previousDataPointsMag[0][2] ) {
        return;
    }

    // Save max value of magZ and min value of magY
    if ( magZMaxValue < magZ ) {
        magZMaxValue = magZ;
    }
    if ( magYMinValue > magY ) {
        magYMinValue = magY;
    }
    // console.log("INFO in do-loop > _keepPrevDataPointsAndXXX: nowHrTime= "+nowHrTime+" \t magZMaxValue= "+magZMaxValue
    //     + ", \t magZ= "+magZ);

    let newLen = previousDataPointsMag.unshift( [ nowHrTime, sensorAngle, magZ, magY, angularVelocity] );    // Add as element [0] of the array
    if ( newLen <= 4 ) {
        return;
    }

    // Conditions for finding a maximum:
    //   -- some movement ( angularVelocity not null), steadily in the same direction
    //          (angularVelocity > 0 or < 0 on all values)
    //   -- close enough from the max magZ value (eliminate false positives)
    //   -- [2][] is a local max

    // At small angular speed, we want close to the max. At higher speed it is not accurate enough
    //let maxCompMagZ = ( angularVelocity < 90 ? 0.8 : 0.4 ) * magZMaxValue;
    //let minCompMagY = ( angularVelocity < 90 ? 0.6 : 0.3 ) * magYMinValue;
    let maxCompMagZ = 0.8 * magZMaxValue;
    let minCompMagY = 0.3 * magYMinValue;
    if ( previousDataPointsMag[2][2] > maxCompMagZ  && previousDataPointsMag[2][3] < minCompMagY
        && Math.abs( angularVelocity ) > 1.0 && Math.abs( angularVelocity ) < 100 ) {

        // Test constant sign of angularVelocity
        let isAngVelocSignConst = (   previousDataPointsMag[0][4] > 0 && previousDataPointsMag[1][4] > 0 && previousDataPointsMag[2][4] > 0
                                   && previousDataPointsMag[3][4] > 0 && previousDataPointsMag[4][4] > 0 )
                               || (   previousDataPointsMag[0][4] < 0 && previousDataPointsMag[1][4] < 0 && previousDataPointsMag[2][4] < 0
                                   && previousDataPointsMag[3][4] < 0 && previousDataPointsMag[4][4] < 0 );
        if ( isAngVelocSignConst ) {
            // Local maximum on magZ?
            if (   previousDataPointsMag[2][2] > previousDataPointsMag[1][2]
                && previousDataPointsMag[1][2] > previousDataPointsMag[0][2]
                && previousDataPointsMag[2][2] > previousDataPointsMag[3][2]
                && previousDataPointsMag[3][2] > previousDataPointsMag[4][2]
            ) {
                // --- We have passed magZ maximum! Compute angleCorrectionFromBottomMagnet
                _computeAngleCorrectionFromBottomMagnet( angularVelocity, magZMaxValue );
                return;
            }
        }
    }

    // Otherwise prune to store only last five (4 + current added)
    previousDataPointsMag.slice(0, 4);
    return;
}


/** Internal: diff from previousDataPointsMag[3][0] */
function _diffHrTime( hrTim) {

    let s  = hrTim[0] - previousDataPointsMag[3][0][0];
    let ns = hrTim[1] - previousDataPointsMag[3][0][1];
    return s + ns * 1.0e-9;
}


/** Internal: compute values at bottom through quadratic regression on magZ and sensorAngle. Params for logs only */
function _computeAngleCorrectionFromBottomMagnet( angularVelocity, magZMaxValue ) {

    let data = [ [ 0,                                       previousDataPointsMag[3][2] ],
                 [ _diffHrTime(previousDataPointsMag[2][0]),   previousDataPointsMag[2][2] ],
                 [ _diffHrTime(previousDataPointsMag[1][0]),   previousDataPointsMag[1][2] ] ];
    let regrMagZ = regression('polynomial', data, 2);
    // magZ = f(t) = regrMagZ[2] * t^2 + regrMagZ[1] * t + regrMagZ[0]
    //console.log( data );
    //console.log( regrMagZ );

    // --- Now find the Time (in seconds) where magZ is maximum, ie when derivative is 0
    //      2 * regrMagZ[2] * t' + regrMagZ[1] = 0
    let timMagZMax = -0.5 * regrMagZ.equation[1] / regrMagZ.equation[2];
    if ( isNaN(timMagZMax) || timMagZMax < 0 || timMagZMax > data[2][0] ) {        // assert timMagZMax <= data[1][0]
        console.log("\nWARNING in do-loop > _computeAngleCorrectionFromBottomMagnet: IGNORE as timMagZMax= "+timMagZMax
            + " should be 0 <= T <= data[2][0]= "+data[2][0]+"\n");
        return;
    }

    // --- From there we can interpolate the sensorAngle value at that time
    let angData = [ [ 0,            previousDataPointsMag[3][1] ],
                    [ timMagZMax,   null ],      // null will be filled using the trend, by regression-js
                    [ data[1][0],   previousDataPointsMag[2][1] ],
                    [ data[2][0],   previousDataPointsMag[1][1] ] ];
    let regrSensorAngle = regression('polynomial', angData, 2);

    // sensorAngleAtMax should be 90, so we auto-correct
    let sensorAngleAtMax = regrSensorAngle.points[1][1];
    let newValAngleCorrectionFromBottomMagnet = (470 - sensorAngleAtMax) % 360;    // 90 + 360

    // TODO : speed correction
    // let angularDrift from last time corrected? Need constant speed?
    let asTimeShifter = (newValAngleCorrectionFromBottomMagnet - angleCorrectionFromBottomMagnet) / angularVelocity / 1000;
    let multCoeff     = 0;
    if (lastHrTimeAngleCorrected) {
        let multCoeffHrTimeDiff = process.hrtime( lastHrTimeAngleCorrected );
        multCoeff     = (newValAngleCorrectionFromBottomMagnet - angleCorrectionFromBottomMagnet) / angularVelocity
                        / (multCoeffHrTimeDiff[0] + multCoeffHrTimeDiff[1] * 1e-9);
    }
    console.log("\nCORRECTIONS: angleCorrectionDiff= "+ (newValAngleCorrectionFromBottomMagnet - angleCorrectionFromBottomMagnet)
        + "\t as time-shift= "+ asTimeShifter +" ms, \t as multiple-coeff= "+ multCoeff );

    console.log("\nINFO in do-loop > _computeAngleCorrectionFromBottomMagnet: at time= "+timMagZMax
                + ", sensorAngleAtMax estimated at "+sensorAngleAtMax
                + "\n\t NEW VALUE angleCorrectionFromBottomMagnet= "+angleCorrectionFromBottomMagnet
                + "\n\t MagZ~= "+previousDataPointsMag[2][2]+", magZMaxValue= "+magZMaxValue+", angularVelocity~= "+angularVelocity+"\n" );

    // Adjust angle correction to best estimate
    angleCorrectionFromBottomMagnet = newValAngleCorrectionFromBottomMagnet;
    lastHrTimeAngleCorrected        = process.hrtime();

    // Empties the data point history as we have found the bottom
    previousDataPointsMag = null;
    return;
}


module.exports.initLoop  = initLoop;
