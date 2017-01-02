// Lea, Jan 2017

const multer = require('multer');

const UPLOAD_DIR     = require("../process/image-functions").UPLOAD_DIR;

var uploadWithMulter = multer({
    // dest:       UPLOAD_DIR
    dest:       "/tmp/"
});
/*
var uploadWithMulter = multer({
    dest:       UPLOAD_DIR,
    fileFilter: function(req, file, cb) {
            console.log( "In fileFilter, with file.originalname = "+ file.originalname +", and file.mimeType = " + file.mimeType );
            // Check that it is an image:
            if ( file.mimeType == 'image/png' || file.mimeType == 'image/gif' || file.mimeType == 'image/jpeg' ) {
                // To accept the file pass `true`, like so:
                cb(null, true);
                return;
            }
            console.error("ERROR in multer upload: WRONG MIME TYPE (not an image) = " + req.file.mimeType );
            // To reject this file pass `false`, like so:
            return cb(null, false);
        },
    limits: {
            fileSize: 100000000          // in bytes. Image size max is 100MB
        }
});
*/


// ---------------- Upload of a new photo --------------------------------------

const cropResizePromise = require("../process/image-functions").cropResizePromise;

// See multer doc at https://www.npmjs.com/package/multer
function uploadPhotoPost(req, res, next) {

    console.log(" API /upload-photo called, file saved?? ");
    //console.log(" API /upload-photo called, file [" + req.file.filename + "] saved! ");

    // TODO: call cropAndResize + display on LED
    if (req.file) {
        return res.sendStatus(200);
    }
    return res.sendStatus(500);
}


module.exports.uploadWithMulter = uploadWithMulter;
module.exports.uploadPhotoPost  = uploadPhotoPost;
