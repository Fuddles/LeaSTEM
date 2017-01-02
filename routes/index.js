var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


// Upload of a new photo
router.post('/upload-photo', function(req, res, next) {

    // TODO

    console.log(" API /upload-photo called ");
    return;
});




module.exports = router;
