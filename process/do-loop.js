// Lea, Jan 2017



// ----------------- Set currently displayed photos ----------------------------
function setCurrentPhotoPromise( resizedPhotoFilename ) {
    return new Promise( function (resolve, reject) {

        // Get the list of all resized images
        getResizedImageSortedListPromise()
        .then( resTimeSortedFilenames => {

            if ( !resTimeSortedFilenames || resTimeSortedFilenames.length < 1 ) {
                console.log("INFO in setCurrentPhotoPromise: EMPTY list of resized images, resizedPhotoFilename="+resizedPhotoFilename);
                _setCurrentPhoto( "" );
                return resolve( "" );
            }

            // Set to most recent if empty name, or not found
            if ( !resizedPhotoFilename || resTimeSortedFilenames.indexOf(resizedPhotoFilename) < 0 ) {
                resizedPhotoFilename = resTimeSortedFilenames[0];
                console.log("INFO in setCurrentPhotoPromise: using MOST RECENT resized image ="+resizedPhotoFilename);
                // Done below: _setCurrentPhoto( resizedPhotoFilename );
            }
            // Otherwise good
            _setCurrentPhoto( resizedPhotoFilename );
            return resolve( resizedPhotoFilename );
        })
        .catch( err => {
            console.error("ERROR in setCurrentPhotoPromise: err =");
            console.error( err );
        });
        return;
    });
}


// Internal function once we know we're good
function _setCurrentPhoto( resizedPhotoFilename ) {
    global.currentImageFileName = resizedPhotoFilename;

    // TODO: trigger image retrieval, change, etc...
}


function getCurrentPhoto() {
    return global.currentImageFileName;
}



module.exports.setCurrentPhotoPromise  = setCurrentPhotoPromise;
module.exports.getCurrentPhoto  = getCurrentPhoto;
