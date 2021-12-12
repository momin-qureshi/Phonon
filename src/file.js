const Image = require('./image');
const fs = require('fs');
const path = require('path');
var sizeOf = require('image-size');

var ext = ['.jpg', '.png'];
var walk = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err)
            return done(err);
        var pending = list.length;
        if (!pending) 
            return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    if(ext.some(r => file.indexOf(r) >= 0)){
                        var dimensions = sizeOf(file);
                        results.push(new Image(path.basename(file), file, {width:dimensions.width, height:dimensions.height}));
                    }
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};
var getFilenames = function (folder, callback) {
    walk(folder, (err, results) => {
        callback(folder, results);
    });
}
var getFile = function(file){
    var dimensions = sizeOf(file);
    return new Image(path.basename(file), file,  {width:dimensions.width, height:dimensions.height});
}   
function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return bitmap.toString('base64');
}
module.exports = {
    getFilenames,
    getFile,
    base64_encode,
    ext
};