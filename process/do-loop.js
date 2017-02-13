// Lea, Jan 2017

const setCurrentPhotoPromise = require('./image-functions').setCurrentPhotoPromise;
const getCurrentPhoto        = require('./image-functions').getCurrentPhoto;
const getPixelsPromise       = require('./image-functions').getPixelsPromise;
const ledLightUp             = require('./led').ledLightUp;


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


        // TODO: launch thread to read gyroscope
        //      global current rotational speed with timestamp
        //      In Node.js, "high resolution time" is made available via process.hrtime.
        //      It returns a array with first element the time in seconds, and second element the remaining nanoseconds.
        //          https://nodejs.org/dist/latest-v6.x/docs/api/process.html#process_process_hrtime_time
        //      Eg: To get current time in microseconds, do the following:
        //          var hrTime = process.hrtime()
        //          console.log(hrTime[0] * 1000000 + hrTime[1] / 1000);

        // --- Display white strip;
        let whiteArray = new Array( NUM_LEDS );
        for (let i = 0; i < NUM_LEDS; i++) {
            whiteArray[i] = [ 255, 255, 255 ];
        }
        ledLightUp( whiteArray );

        // FIXME
        global.testAngle = 0;

        // --- Launch interval func to refresh LED display
        doLedDisplayLoop();
        return;
    })
    .catch( err => {
        console.error("ERROR in app.js: err =");
        console.error( err );
    });
}


/**
 *  For a given image (currentPhoto) and a given angle, display the LED corresponding colors
 */
function doLedDisplayLoop() {

    _doLoop( global.testAngle, getCurrentPhoto() );

    // FIXME
    global.testAngle = (global.testAngle + 1) % 360;

    // Loop over within _doLoop when lighting-up is complete
}


/** Internal */
function _doLoop( angle, photoFilename ) {

    getPixelsPromise( angle, photoFilename )
    .then( ledColorArray => {

        // Display the colors on the LEDs
        ledLightUp( ledColorArray );

        // Loop
        setTimeout( doLedDisplayLoop, 10 );      // 10 ms later // FIXME 0

    })
    .catch( err => {
        console.error("ERROR in _doLoop: err =");
        console.error( err );
    });
}


module.exports.initLoop  = initLoop;
