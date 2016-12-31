// Functions to crop, resize and exctract pixels
// Lea, Dec 2016

const fs = require('fs');
const gm = require('gm');

const UPLOAD_DIR  = process.env.UPLOAD_DIR  || "/var/www/uploaded-images/";
const RESIZED_DIR = process.env.RESIZED_DIR || "/var/www/resized-images/";


// Crop and resize image in UPLOAD_DIR
export function cropResizePromise( filename, finalsize ) {

    return new Promise( function(resolve, reject) {

        if( !filename || filename.indexOf('/') >= 0 ) {
            throw new Error ("Bad filename in cropResize");
        }
        if( !finalsize || finalsize < 50 ) {
            throw new Error ("Bad finalsize in cropResize");
        }

        var img = gm( UPLOAD_DIR + filename );
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

            if (h > w) {
                img = img.crop( w, w, 0, (h-w)/2 );
            }
            else if (w > h) {
                img = img.crop( h, h, (w-h)/2, 0 );
            }
            // if w == h nothing to do

            // --- Resize

            img = img.resize(finalsize, finalsize);

            // Save image

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
}
