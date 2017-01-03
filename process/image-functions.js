// Functions to crop, resize and exctract pixels
// Lea, Dec 2016

// WARNING: when vertical, the LED strip must have led #0 at the top and be left of the wheel

const fs = require('fs');
const gm = require('gm');
const gp = require("get-pixels");

const UPLOAD_DIR  = process.env.UPLOAD_DIR  || "/var/www/uploaded-images/";
const RESIZED_DIR = process.env.RESIZED_DIR || "/var/www/resized-images/";

// Number of LEDs on the strip
const NUM_LEDS    = process.env.NUM_LEDS    || 72;
// Distance between the LED strip and the center of the wheel -> ratio dist / radius
const DELTA       = process.env.DELTA       || 0.05;

// Size of the resized image
const RESIZED_IMAGE_SIZE = process.env.RESIZED_IMAGE_SIZE   || 300;


// Takes resized image and angle, and returns an array of RGB pixels 3 channels only!
// Angle in degrees [0..360[
function getPixelsPromise( angle, resizedImageFileName, imgSize = RESIZED_IMAGE_SIZE ) {

    return new Promise( function(resolve, reject) {

        if( !resizedImageFileName || resizedImageFileName.indexOf('/') >= 0 ) {
            throw new Error ("Bad filename in getPixels");
        }
        if( !imgSize || imgSize < 50 ) {
            throw new Error ("Bad imgSize in getPixels");
        }

        // Reads all the pixels from url into an ndarray:
        // Returns An ndarray of pixels in raster order having shape equal to [width, height, channels].
        gp( RESIZED_DIR + resizedImageFileName, function(err, pixels) {

            //console.log( pixels );
            if (err || !pixels || !pixels.data || !pixels.shape) {
                console.error("Error in getPixels after gp(). Err is:");
                console.error(err);
                return reject(err);
            }

            // Check dimensions
            let numChannels = pixels.shape[2];         // Should be 4
            if (  (numChannels != 3 && numChannels != 4) || pixels.shape[0] != imgSize || pixels.shape[1] != imgSize ) {
                console.error("\n--------------------\n");
                console.error("WRONG DIMENSIONS in getPixels > gp(), for file=[%s]. Look at shape array: \n", resizedImageFileName);
                console.error( pixels );
                console.error("\n--------------------\n");
            }
            let pix = pixels.data;

            // Now we have our array of pixels[x][y][c]
            let resArray    = new Array( NUM_LEDS );
            let angleInRad = Math.PI / 180.0 * angle;
            let cosAngle   = Math.cos( angleInRad );
            let sinAngle   = Math.sin( angleInRad );

            for (let i = 0; i < NUM_LEDS; i++) {
                let pt = _calcLEDPosition( cosAngle, sinAngle, i );      // Return pt.x and pt.y to be multiplied by imgSize/2
                let x  = Math.round( pt.x * imgSize / 2 );
                if ( x >= imgSize ) {
                    x = imgSize - 1;
                }
                let y  = Math.round( pt.y * imgSize / 2 );
                if ( y >= imgSize ) {
                    y = imgSize - 1;
                }
                let pos = numChannels * (x + y * imgSize);
                if (pos + 2 >= pix.length ) {
                    console.error( "ERROR in getPixels > gp() getting the color: OUT OF BOUNDS!! [pos=%d]", pos );
                    resArray[i] = [0, 0, 0];
                    continue;
                }
                resArray[i] = [ pix[pos], pix[pos+1], pix[pos+2] ];
            }
            return resolve( resArray );

        });
    });
}


// Internal
function _calcLEDPosition( cosAngle, sinAngle, idx ) {
    let d = 2 * idx / NUM_LEDS - 1;
    return {
        x: 1 + d * sinAngle - DELTA * cosAngle,
        y: 1 - d * cosAngle - DELTA * sinAngle
    };
}

// Exportable version of computing position function. angle in degrees.
// Returns an array of {x:, y:}
function getLEDPositionsWithDelta( angle ) {

    let resArray   = new Array( NUM_LEDS );
    let angleInRad = Math.PI / 180.0 * angle;
    let cosAngle   = Math.cos( angleInRad );
    let sinAngle   = Math.sin( angleInRad );
    let halfSize   = RESIZED_IMAGE_SIZE / 2;

    let deltaX     =   DELTA * halfSize * sinAngle;
    let deltaY     = - DELTA * halfSize * cosAngle;

    for (let i = 0; i < NUM_LEDS; i++) {
        let pt = _calcLEDPosition( cosAngle, sinAngle, i );      // Return pt.x and pt.y to be multiplied by imgSize/2
        let x  = Math.round( pt.x * halfSize + deltaX );
        x = Math.min( Math.max( x, 0 ), RESIZED_IMAGE_SIZE - 1 );
        let y  = Math.round( pt.y * halfSize + deltaY );
        y = Math.min( Math.max( y, 0 ), RESIZED_IMAGE_SIZE - 1 );
        resArray[i] = { x: x, y: y };
    }
    return resArray;
}




// Crop and resize image in UPLOAD_DIR
function cropResizePromise( filename, finalsize = RESIZED_IMAGE_SIZE) {

    return new Promise( function(resolve, reject) {

        if( !filename || filename.indexOf('/') >= 0 ) {
            throw new Error ("Bad filename in cropResize");
        }
        if( !finalsize || finalsize < 50 ) {
            throw new Error ("Bad finalsize in cropResize");
        }

        // Retrieve the image
        var img = gm( UPLOAD_DIR + filename );

        // --- Correct Orientation first!
        //      Warning: autoOrient does not work when using crop() and resize()
        img.orientation( function(err, value) {
            if (err || !value) {
                console.error("Error in cropResize after orientation(). Err is:");
                console.error(err);
                return reject(err);
            }
            console.log("Info in cropResize: Orientation is " + value);

            let rotationAngleCW = 0;
            if (value == "RightTop") {
                rotationAngleCW = 90;               // turn 90 CW
            }
            else if (value == "BottomRight") {
                rotationAngleCW = 180;              // turn 180 CW
            }
            // if (!value || value == "TopLeft") --> OK
            // Rotate the image to correct, and then erase EXIF profile with .noProfile();
            img = img.rotate( "black", rotationAngleCW ).noProfile();
            img.write( UPLOAD_DIR + "temp-rotated-" + filename, function(err) {

                // Create a new object to prevent messing up with orientation!
                img = gm( UPLOAD_DIR + "temp-rotated-" + filename );

                // Retrieve size
                img.size( function(err, value) {
                    if (err || !value) {
                        console.error("Error in cropResize after size(). Err is:");
                        console.error(err);
                        return reject(err);
                    }

                    // --- Crop

                    // value.width and value.height
                    let w = value.width;
                    let h = value.height;
                    console.log("\nInfo in cropResizePromise. Image [%s] size is W=%d, H=%d\n", filename, w, h);

                    if (h > w) {
                        img = img.crop( w, w, 0, (h-w)/2 );
                    }
                    else if (w > h) {
                        img = img.crop( h, h, (w-h)/2, 0 );
                        // FIXME: Test !!!!
                        //img.write( UPLOAD_DIR + "temp-cropped-" + filename, (err)=>{} );
                        //console.log("Info in cropResizePromise. Image cropped [temp-cropped-%s] written to disk\n", filename);
                    }
                    // if w == h nothing to do

                    // --- Resize, then correct its orientation and remove EXIF info
                    img = img.resize(finalsize, finalsize);
                    // FIXME: Test !!!!
                    //img.write( UPLOAD_DIR + "temp-resized-" + filename, (err)=>{} );
                    //console.log("Info in cropResizePromise. Image cropped [temp-resized-%s] written to disk\n", filename);

                    // --- Save image
                    img.write(RESIZED_DIR + filename, function(err) {
                        if (err) {
                            console.error("Error in cropResize after write(). Err is:");
                            console.error(err);
                            return reject(err);
                        }

                        // Here image is saved!
                        return resolve(img);
                    });
                });
            });
        });
    });
}



// -------- Retrieve list of resized image files by modified-date DESC -----------

function getResizedImageSortedListPromise() {
    return new Promise( function (wholeResolve, wholeReject) {

        fs.readdir( RESIZED_DIR, function(err, files) {
            if (err || !files) {
                console.error("ERROR in getResizedImageSortedList > readdir, error is:");
                console.error(err);
                wholeReject(err);
            }

            //console.log( "\nInfo in getResizedImageSortedList, readdir files: ");
            //console.log( files );

            Promise.all( files.map( fname => {
                return new Promise( function(resolve, reject) {
                    fs.stat( RESIZED_DIR + fname, (err, stats) => {
                        if (err) {
                            return reject(err);
                        }
                        //console.log( "\nInfo in getResizedImageSortedList, stat'ing file " + fname );
                        //console.log( stats );

                        return resolve({
                            name: fname,
                            time: stats.mtime.getTime()
                        });
                    });
                })
            }))
            .then( fnametimes => {

                //console.log( "\nInfo in getResizedImageSortedList, after stat'ing files: ");
                //console.log( fnametimes );

                let resTimeSortedFilenames =
                    fnametimes.sort( function(a, b) { return b.time - a.time; } )     // Descending order
                    .map( fnt => { return fnt.name; } );

                return wholeResolve( resTimeSortedFilenames );
            })
            .catch( err => {
                console.error("ERROR in getResizedImageSortedList > sorting. err =");
                console.error( err );
                wholeReject(err);
            });
        });
    });
}







module.exports.cropResizePromise = cropResizePromise;
module.exports.getPixelsPromise  = getPixelsPromise;
module.exports.getResizedImageSortedListPromise  = getResizedImageSortedListPromise;
module.exports.getLEDPositionsWithDelta = getLEDPositionsWithDelta;
module.exports.NUM_LEDS   = NUM_LEDS;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
module.exports.RESIZED_DIR = RESIZED_DIR;
module.exports.RESIZED_IMAGE_SIZE = RESIZED_IMAGE_SIZE;
