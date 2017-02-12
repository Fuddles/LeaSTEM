// Lea, Jan 2017

const setCurrentPhotoPromise = require('./image-functions').setCurrentPhotoPromise;
// const cropResizePromise      = require('./image-functions').cropResizePromise;
// const getPixelsPromise       = require('./image-functions').getPixelsPromise;
// const ledLightUp             = require('./led').ledLightUp;
//const getResizedImageSortedListPromise = require("./image-functions").getResizedImageSortedListPromise;



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


        // TODO: Launch interval func to refresh LED display:
        //          setTimeout 1ms, but wait for async signal that previous have finished
        //          => inside the callback

    })
    .catch( err => {
        console.error("ERROR in app.js: err =");
        console.error( err );
    });
    return;
}


module.exports.initLoop  = initLoop;
