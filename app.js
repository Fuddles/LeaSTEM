var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- Serve uploaded-images
const RESIZED_DIR = require("../process/image-functions").RESIZED_DIR;
app.use('/resized-images', express.static( RESIZED_DIR ));


app.use('/', index);
app.use('/users', users);


// --- Photo upload
var uploadWithMulter = require('./routes/upload').uploadWithMulter;
var uploadPhotoPost  = require('./routes/upload').uploadPhotoPost;
app.post( '/upload-photo', uploadWithMulter.single('myphoto'), uploadPhotoPost );


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


// ----------- TESTS LEA -----------
// require("./lightup.js");

const cropResizePromise = require('./process/image-functions').cropResizePromise;
const getPixelsPromise  = require('./process/image-functions').getPixelsPromise;
const ledLightUp        = require('./process/led').ledLightUp;



global.currentImageFileName = process.env.CURRENT_IMAGE_FILENAME || ''; // getMostRecentResizedImage();    // TODO !!!!

// TODO: get most recent image of the RESIZED_DIR
//  if no global.currentImageFileName defined

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



//let filenames = ['wheel.jpg', 'wheel2.jpg', 'yoda.jpg', 'feedly.png'];
let filenames = ['feedly.png'];

/* FIXME
for (let fname of filenames) {
    cropResizePromise( fname, 300 )
    .then( img => {
        console.log( "SUCCESS in app.js > cropResizePromise for image " + fname );

        for ( let ang = 0; ang < 10*360; ang+=10 ) {

            let angle = ang % 360;
            setTimeout( function() {

                console.log( "Starting getPixelsPromise in app.js > for angle = " + angle );
                getPixelsPromise( angle, fname, 300 )  // angle, resizedImageFileName, imgSize
                .then( colors => {
                    console.log( "SUCCESS in app.js > getPixelsPromise for image " + fname + " with angle=" + angle );
                    console.log( colors );

                    ledLightUp( colors );     //colors

                })
                .catch( err => {
                    console.error("ERROR in app.js > getPixelsPromise. err =");
                    console.error( err );
                });

            }, ang * 500 );     // steps 10 deg * 500 ms = every 5 secs

        }
    })
    .catch( err => {
        console.error("ERROR in app.js > cropResizePromise. err =");
        console.error( err );
    });
}
*/





// ---------------------------------

module.exports = app;
