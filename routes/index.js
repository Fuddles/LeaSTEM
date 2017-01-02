// Lea, Jan 2017

var express = require('express');

const multer = require('multer');

const UPLOAD_DIR     = require("../process/image-functions").UPLOAD_DIR;
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


var router = express.Router();


// ---------------- Upload of a new photo --------------------------------------

const cropResizePromise = require("../process/image-functions").cropResizePromise;

// See multer doc at https://www.npmjs.com/package/multer
router.post('/upload-photo', uploadWithMulter.single('myImage'), function(req, res, next) {

    console.log(" API /upload-photo called, file [" + req.file.filename + "] saved! ");

    // TODO: call cropAndResize + display on LED

    return;
});




// ---------------- Home page --------------------------------------

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Lea 7th grade 2017 STEM Project ' });
});


module.exports = router;
