// Lea, Jan 2017

var express = require('express');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Lea 7th grade 2017 STEM Project ' });
});


// ----------- Send list of resized image files ----------------

const getResizedImageSortedListPromise = require("../process/image-functions").getResizedImageSortedListPromise;

router.get('/list-photos', function(req, res, next) {

    getResizedImageSortedListPromise()
    .then( resTimeSortedFilenames => {
        return res.json( resTimeSortedFilenames );
    })
    .catch( err => {
        console.error("ERROR in list-photos: err =");
        console.error( err );
        return res.sendStatus( 500 );
    });
});


// ---------- Touch photo to make it latest (last modified) --------------------

const touch = require("touch");
const setCurrentPhotoPromise = require('../process/do-loop').setCurrentPhotoPromise;

router.get('/touch-photo', function(req, res, next) {
    let fname = req.query.name;
    if (!fname) {
        console.log("\nWarning in /touch-photo: query param name NULL");
        console.log(req.query);
        return;
    }

    // Just perform a unix 'touch' on the file
    touch( RESIZED_DIR + fname, function(err) {
        if (!err) {
            // Set the image as the new current one !!
            setCurrentPhotoPromise( process.env.CURRENT_IMAGE_FILENAME )
            .then( fname => {
                return res.sendStatus( 200 );
            })
            .catch( err => {
                console.error("ERROR in /touch-photo > setCurrentPhotoPromise: err =");
                console.error( err );
                return res.sendStatus( 500 );
            });
        }
        console.error("\nERROR in /touch-photo > touch: err=");
        console.error(err);
        return res.sendStatus( 500 );
    });
});



module.exports = router;
