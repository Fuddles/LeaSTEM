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

app.use('/', index);
app.use('/users', users);

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

//let filenames = ['wheel.jpg', 'wheel2.jpg', 'yoda.jpg', 'feedly.png'];
let filenames = ['feedly.png'];

for (let fname of filenames) {
    cropResizePromise( fname, 300 )
    .then( img => {
        console.log( "SUCCESS in app.js > cropResizePromise for image " + fname );

        for ( let ang = 0; ang < 10*360; ang++ ) {

            let angle = ang % 360;
            setTimeout( function() {

                console.log( "Starting getPixelsPromise in app.js > for angle = " + angle );
                getPixelsPromise( angle, fname, 300 )  // angle, resizedImageFileName, imgSize
                .then( colors => {
                    console.log( "SUCCESS in app.js > getPixelsPromise for image " + fname + " with angle=" + angle );
                    // console.log( colors );

                    ledLightUp( colors );     //colors

                })
                .catch( err => {
                    console.error("ERROR in app.js > getPixelsPromise. err =");
                    console.error( err );
                });

            }, ang * 100 );

        }
    })
    .catch( err => {
        console.error("ERROR in app.js > cropResizePromise. err =");
        console.error( err );
    });
}





// ---------------------------------

module.exports = app;
