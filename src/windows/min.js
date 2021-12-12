const ipc = require('electron').ipcRenderer;

function loadFile(path) {
    var imageContainer = document.getElementById('img-panel')
    imageContainer.src = path;
}

document.onkeydown = function myKeyPress(e) {
    var keynum;

    if (window.event) { // IE                    
        keynum = e.keyCode;
    } else if (e.which) { // Netscape/Firefox/Opera                   
        keynum = e.which;
    }

    ipc.send('keyEvent', keynum);
}

ipc.on('openFile', function (event, image) {
    console.log(image)
    loadFile(image.path);
});