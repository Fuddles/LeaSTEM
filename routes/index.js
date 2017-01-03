// Lea, Jan 2017

var express = require('express');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Lea 7th grade 2017 STEM Project', datime: "?_dt="+(Date.now() % 100000000) });
});


// ----------- Send list of resized image files ----------------

const getResizedImageSortedListPromise = require("../process/image-functions").getResizedImageSortedListPromise;

router.get('/list-photos', function(req, res, next) {

    getResizedImageSortedListPromise()
    .then( resTimeSortedFilenames => {
        return res.json( resTimeSortedFilenames );
    })
    .catch( err => {
        console.error("ERROR in /list-photos: err =");
        console.error( err );
        return res.sendStatus( 500 );
    });
});


// ---------- Touch photo to make it latest (last modified) --------------------

const touch = require("touch");

const setCurrentPhotoPromise = require('../process/do-loop').setCurrentPhotoPromise;
const RESIZED_DIR            = require("../process/image-functions").RESIZED_DIR;

router.get('/touch-photo', function(req, res, next) {
    let fname = req.query.name;
    if (!fname) {
        console.log("\nWarning in /touch-photo: query param name NULL");
        console.log(req.query);
        return;
    }

    // Just perform a unix 'touch' on the file
    touch( RESIZED_DIR + fname, function(err) {
        if (err) {
            console.error("\nERROR in /touch-photo > touch: err=");
            console.error(err);
            return res.sendStatus( 500 );
        }

        // Set the image as the new current one !!
        console.log("\nInfo in /touch-photo: TOUCH succeeded, setting current photo ["+ fname +"] now\n");
        setCurrentPhotoPromise( fname )
        .then( fname => {
            return res.sendStatus( 200 );
        })
        .catch( err => {
            console.error("ERROR in /touch-photo > setCurrentPhotoPromise: err =");
            console.error( err );
            return res.sendStatus( 500 );
        });
    });
});



// -------------------- Dots coordinates and colors ----------------------------


const getLEDPositionsWithDelta  = require("../process/image-functions").getLEDPositionsWithDelta;
const getPixelsPromise = require("../process/image-functions").getPixelsPromise;
const getCurrentPhoto  = require("../process/do-loop").getCurrentPhoto;


router.get('/dot-coords', function(req, res, next) {

    let angle = Number.parseFloat(req.query.angle) || 0;               // ?angle=  in degrees
    return res.json( getLEDPositionsWithDelta( angle ) );
});


router.get('/dot-colors', function(req, res, next) {

    let angle = Number.parseFloat(req.query.angle) || 0;               // ?angle=  in degrees
    let resizedImageFileName = getCurrentPhoto();
    if (!resizedImageFileName) {
        return res.status(404).send('No photos found: upload a photo first!');
    }

    getPixelsPromise( angle, resizedImageFileName )
    .then( colors => {
        return res.json( colors );
    })
    .catch( err => {
        console.error("ERROR in /dot-colors: err =");
        console.error( err );
        return res.sendStatus( 500 );
    });
});



module.exports = router;
