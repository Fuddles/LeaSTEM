// Lea, Jan 2017

var express = require('express');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Lea 7th grade 2017 STEM Project ' });
});


// ----------- Send list of resized image files ----------------

const RESIZED_DIR = require("../process/image-functions").RESIZED_DIR;

const path    = require('path');
const fs      = require('fs');

router.get('/list-photos', function(req, res, next) {

    fs.readdir( RESIZED_DIR, function(err, files) {
        if (err || !files) {
            console.error("ERROR in list-photos > readdir, error is:");
            console.error(err);
            return res.sendStatus( 500 );
        }

        console.log( "\nInfo in list-photos, readdir files: ");
        console.log( files );

        Promise.all( files.map( fname => {
            return new Promise( function(resolve, reject) {
                fs.stat( RESIZED_DIR + fname, (err, stats) => {
                    if (err) {
                        return reject(err);
                    }
                    console.log( "\nInfo in list-photos, stat'ing file " + fname );
                    console.log( stats );

                    return resolve({
                        name: fname,
                        time: stats.mtime.getTime()
                    });
                });
            })
        }))
        .then( fnametimes => {

            console.log( "\nInfo in list-photos, after stat'ing files: ");
            console.log( fnametimes );

            let resTimeSortedFilenames =
                fnametimes.sort( function(a, b) { return b.time - a.time; } )     // Descending order
                          .map( fnt => { return fnt.name; } );

            return res.json( resFnames );
        })
        .catch( err => {
            console.error("ERROR in list-photos > sorting. err =");
            console.error( err );
            return res.sendStatus( 500 );
        });
    });
});



module.exports = router;
