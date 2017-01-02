// Lea, Jan 2017

const multer = require('multer');

const UPLOAD_DIR = require("../process/image-functions").UPLOAD_DIR;


var multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log("Info in multerStorage > destination: upload dir = " + UPLOAD_DIR);
        //cb(null, '/tmp/');
        cb( null, UPLOAD_DIR );
    },
    filename: function (req, file, cb) {
        let fname = file.originalname;
        if ( !fname || fname.indexOf('.') < 0 )
            fname = "photo" + (file.mimetype == 'image/png' ? ".png" : ".jpg");
        let p   = fname.lastIndexOf('.');
        let tim = Date.now() % 100000;
        cb( null, fname.substring(0,p) + '-' + tim + fname.substring(p) );
    }
});

var uploadWithMulter = multer({
    storage:    multerStorage,
    fileFilter: function(req, file, cb) {
            console.log( "In fileFilter, with file.originalname = "+ file.originalname +", and file.mimetype = " + file.mimetype );
            // Check that it is an image:
            if ( file.mimetype == 'image/png' || file.mimetype == 'image/gif' || file.mimetype == 'image/jpeg' ) {
                // To accept the file pass `true`, like so:
                cb(null, true);
                return;
            }
            console.error("ERROR in multer upload: WRONG MIME TYPE (not an image) = " + file.mimetype );
            // To reject this file pass `false`, like so:
            return cb(null, false);
        },
    limits: {
            fileSize: 100000000          // in bytes. Image size max is 100MB
        }
});



// ---------------- Upload of a new photo --------------------------------------

const cropResizePromise = require("../process/image-functions").cropResizePromise;

// See multer doc at https://www.npmjs.com/package/multer
function uploadPhotoPost(req, res, next) {

    console.log(" API /upload-photo called, file saved?? ");
    //console.log(" API /upload-photo called, file [" + req.file.filename + "] saved! ");

    // TODO: call cropAndResize + display on LED
    if (req.file) {
        return res.redirect('/');
    }
    return res.sendStatus(500);
}


module.exports.uploadWithMulter = uploadWithMulter;
module.exports.uploadPhotoPost  = uploadPhotoPost;
