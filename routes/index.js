// Lea, Jan 2017

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Lea 7th grade 2017 STEM Project ' });
});



// ---------------- Upload of a new photo --------------------------------------

const multer  = require('multer');

const UPLOAD_DIR        = require("../process/image-functions").UPLOAD_DIR;
const cropResizePromise = require("../process/image-functions").cropResizePromise;

var uploadWithMulter = multer({
    dest:       UPLOAD_DIR,
    fileFilter: function(req, file, cb) {
            // Check that it is an image:
            if ( req.file.mimeType == 'image/png' || req.file.mimeType == 'image/gif' || req.file.mimeType == 'image/jpeg' ) {
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

// See multer doc at https://www.npmjs.com/package/multer
router.post('/upload-photo', uploadWithMulter.single('myImage'), function(req, res, next) {

    console.log(" API /upload-photo called, file [" + req.file.filename + "] saved! ");

    // TODO: call cropAndResize + display on LED

    return;
});




module.exports = router;
