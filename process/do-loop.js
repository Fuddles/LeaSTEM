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
// WARNING: [1]..[9] are STRINGs!

const regression             = require('regression');

const setCurrentPhotoPromise = require('./image-functions').setCurrentPhotoPromise;
const getCurrentPhoto        = require('./image-functions').getCurrentPhoto;
const getPixelsPromise       = require('./image-functions').getPixelsPromise;
const NUM_LEDS               = require("./image-functions").NUM_LEDS;
const WHITE_ARRAY            = require('./led').WHITE_ARRAY;
const ledLightUp             = require('./led').ledLightUp;

const ANGLE_FIXED_CORRECTION = 90;
const SENSOR_READ_DELAY_IN_NANOS = 5000000;    // FIXME: 20ms ??      // Delay to add to hrTimeDiff to account for sensor read delay

// --- Magnet must be attached at the bottom of the reference frame. There we should have angle = 180 deg
//      We use magZ (global.bnoValues[9]) maximum to infer where the absolute bottom is and correct drift
var   averageDisplayTimeInNanos       = 1500000;      // Around 1500 microseconds on average
var   averageAngularDriftInXXX        = 0;  // FIXME
var   angleCorrectionFromBottomMagnet = 0;
//
var   magZMaxValue                    = -1000;
var   previousDataPoints              = null;         // array of [hrtime, sensorAngle, magZ, angVeloc]. We keep the last 4 values.
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
    let angle           = (ANGLE_FIXED_CORRECTION - (sensorAngle + angleCorrectionFromBottomMagnet) + 720) % 360;

    // --- Use angular velocity and elapsed time to improve the currentAngle.
    //      We should always be under 1 sec!
    let currentAngle    = angle;
    let angleDiff       = (hrTimeDiff[1] + averageDisplayTimeInNanos + SENSOR_READ_DELAY_IN_NANOS) * 1.0e-9 * angularVelocity;

    // FIXME: averageAngularDriftInXXX

    if ( Math.abs(angleDiff) >= 0.1 ) {
        currentAngle    = (angle + angleDiff + 360 ) % 360;
        if ( Math.abs(angleDiff) >= 10 ) {
            console.log( "DIFF angle \t hrTimeDiff= "+ Math.floor(hrTimeDiff[0] * 1000 + hrTimeDiff[1]* 1e-6)
            + "ms, with velocity: \t angle= "+ angle +" \t angleDiff= "+ angleDiff
            + "\n\t\t angularVelocity= "+ angularVelocity +" deg/s" );
        }
    }

    // --- Keep last 5 data points and then correct the angle by detecting the bottom (peak of magZ)
    let magZ = Number.parseFloat( global.bnoValues[9] );
    _keepPreviousDataPointsAndFindMaxMagZToComputeAngleCorrectionFromBottomMagnet(
            nowHrTime, sensorAngle, magZ, angularVelocity );

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


/** Internal: maintain previousDataPoints, look for a maximum in magZ,
 *    and when found, computeAngleCorrection (magnet supposed to be at bottom => sensor angle 90 deg)
 */
function _keepPreviousDataPointsAndFindMaxMagZToComputeAngleCorrectionFromBottomMagnet(
        nowHrTime, sensorAngle, magZ, angularVelocity ) {

    if ( !previousDataPoints ) {
        previousDataPoints = [ [ nowHrTime, sensorAngle, magZ, angularVelocity ] ];
        return;
    }

    // First we check we do have a new value (magnetometer measures are not as fast as this loop)
    if ( magZ === previousDataPoints[0][2] ) {
        return;
    }

    // Save max value of magZ
    if ( magZMaxValue < magZ ) {
        magZMaxValue = magZ;
    }
    console.log("INFO in do-loop > _keepPrevDataPointsAndXXX: nowHrTime= "+nowHrTime+" \t magZMaxValue= "+magZMaxValue
        + ", \t magZ= "+magZ);

    let newLen = previousDataPoints.unshift( [ nowHrTime, sensorAngle, magZ, angularVelocity ] );    // Add as element [0] of the array
    if ( newLen <= 4 ) {
        return;
    }

    // Conditions for finding a maximum:
    //   -- some movement ( angularVelocity not null), steadily in the same direction
    //          (angularVelocity > 0 or < 0 on all values)
    //   -- close enough from the max magZ value (eliminate false positives)
    //   -- [2][] is a local max

    // At small angular speed, we want close to the max, but at higher speed the value is lower
    let maxCompMagZ = ( angularVelocity < 90 ? 0.6 : 0.3 ) * magZMaxValue;
    if ( previousDataPoints[2][2] > maxCompMagZ && Math.abs( angularVelocity ) > 1.0 ) {
        // Test constant sign of angularVelocity
        if (  (   previousDataPoints[0][3] > 0 && previousDataPoints[1][3] > 0 && previousDataPoints[2][3] > 0
               && previousDataPoints[3][3] > 0 && previousDataPoints[4][3] > 0 )
           || (   previousDataPoints[0][3] < 0 && previousDataPoints[1][3] < 0 && previousDataPoints[2][3] < 0
               && previousDataPoints[3][3] < 0 && previousDataPoints[4][3] < 0 )
        ) {
            // Local maximum on magZ?
            if (   previousDataPoints[2][2] > previousDataPoints[1][2]
                && previousDataPoints[1][2] > previousDataPoints[0][2]
                && previousDataPoints[2][2] > previousDataPoints[3][2]
                && previousDataPoints[3][2] > previousDataPoints[4][2]
            ) {
                // --- We have passed magZ maximum! Compute angleCorrectionFromBottomMagnet
                _computeAngleCorrectionFromBottomMagnet( angularVelocity, magZMaxValue );
                return;
            }
        }
    }

    // Otherwise prune to store only last five (4 + current added)
    previousDataPoints.slice(0, 4);
    return;
}


/** Internal: diff from previousDataPoints[4][0] */
function _diffHrTime( hrTim) {

    let s  = hrTim[0] - previousDataPoints[3][0][0];
    let ns = hrTim[1] - previousDataPoints[3][0][1];
    return s + ns * 1.0e-9;
}


/** Internal: compute values at bottom through quadratic regression on magZ and sensorAngle. Params for logs only */
function _computeAngleCorrectionFromBottomMagnet( angularVelocity, magZMaxValue ) {

    let data = [ [ 0,                                       previousDataPoints[3][2] ],
                 [ _diffHrTime(previousDataPoints[2][0]),   previousDataPoints[2][2] ],
                 [ _diffHrTime(previousDataPoints[1][0]),   previousDataPoints[1][2] ] ];
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
    let angData = [ [ 0,            previousDataPoints[3][1] ],
                    [ timMagZMax,   null ],      // null will be filled using the trend, by regression-js
                    [ data[1][0],   previousDataPoints[2][1] ],
                    [ data[2][0],   previousDataPoints[1][1] ] ];
    let regrSensorAngle = regression('polynomial', angData, 2);

    // sensorAngleAtMax should be 90, so we auto-correct
    let sensorAngleAtMax = regrSensorAngle.points[1][1];
    let newValAngleCorrectionFromBottomMagnet = (470 - sensorAngleAtMax) % 360;    // 90 + 360

    // TODO : speed correction
    // FIXME: averageAngularDriftInXXX
    // let angularDrift from last time corrected? Need constant speed?
    let asTimeShifter = (newValAngleCorrectionFromBottomMagnet - angleCorrectionFromBottomMagnet) / angularVelocity / 1000;
    let multCoeff     = 0;
    if (lastHrTimeAngleCorrected) {
        let multCoeffHrTimeDiff = process.hrtime( lastHrTimeAngleCorrected );
        multCoeff     = (newValAngleCorrectionFromBottomMagnet - angleCorrectionFromBottomMagnet) / angularVelocity
                        / (multCoeffHrTimeDiff[0] + multCoeffHrTimeDiff[1] * 1e-9);
    }
    console.log("CORRECTIONS: angleCorrectionDiff= "+ (newValAngleCorrectionFromBottomMagnet - angleCorrectionFromBottomMagnet)
        + "\t as time-shift= "+ asTimeShifter +" ms, \t as multiple-coeff= "+ multCoeff );

    console.log("\nINFO in do-loop > _computeAngleCorrectionFromBottomMagnet: at time= "+timMagZMax
                + ", sensorAngleAtMax estimated at "+sensorAngleAtMax
                + "\n\t NEW VALUE angleCorrectionFromBottomMagnet= "+angleCorrectionFromBottomMagnet
                + "\n\t MagZ~= "+previousDataPoints[2][2]+", magZMaxValue= "+magZMaxValue+", angularVelocity~= "+angularVelocity+"\n" );

    // Adjust angle correction to best estimate
    angleCorrectionFromBottomMagnet = newValAngleCorrectionFromBottomMagnet;
    lastHrTimeAngleCorrected        = process.hrtime();

    // Empties the data point history as we have found the bottom
    previousDataPoints = null;
    return;
}


module.exports.initLoop  = initLoop;
