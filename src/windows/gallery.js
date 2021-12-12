const ipc = require('electron').ipcRenderer;
const panzoom = require('panzoom');
const jstree = require('jstree');

var winSize = { height: 0, width: 0 };
var parent = document.getElementById('main-image');
var instance = null;
var treeInstance = null;
var image;
var rotation = 0;
var flip = false;

var filters_enabled = false;

var fit = true;

var sidebarHidden = false;

var calledFromResize = false;
var splitinstance = Split(['#main-image', '#directories'], {
    minSize: [0, 0],
    sizes: [70, 30],
    gutterSize: 8,
    cursor: 'col-resize',
})
var splitinstance2 = Split(['#main-panel', '#filter-panel'], {
    direction: 'vertical',
    minSize: [0, 0],
    sizes: [100, 0],
    gutterSize: 8,
    cursor: 'row-resize',
})

var miniImage;

function loadFile(file) {
    
    $('#img-panel').removeClass('rotateimg90');
    $('#img-panel').removeClass('rotateimg180');
    $('#img-panel').removeClass('rotateimg270');
    rotation = 0
    
    $('#img-panel').removeClass('flipimg');
    flip = false;

    treeInstance.jstree().deselect_all()
    image = file;
    var imageContainer = document.getElementById('img-panel')
    imageContainer.src = 'data:image/png;base64, ' + image.base64;


    var node = treeInstance.jstree().get_node(image.index + 1);
    treeInstance.trigger('select_node.jstree', { index: image.index + 1, onlyUpdate: true })

    winSize = { height: parent.clientHeight, width: parent.clientWidth };

    var zoom = Math.min(winSize.height / image.props.height, winSize.width / image.props.width);
    var offsetX = (winSize.width - (image.props.width * zoom)) / 2;
    var offsetY = (winSize.height - (image.props.height * zoom)) / 2;
    fit = true;

    instance = panzoom(document.getElementById('panzoompanel'), {
        smoothScroll: false,
        filterKey: function (e, dx, dy, dz) {
            return true;
        },
        transformOrigin: { x: 0.5, y: 0.5 },
        maxZoom: 20,
        minZoom: 0.05,
    });
    instance.zoomAbs(0, 0, zoom);
    instance.moveTo(offsetX, offsetY);
    var instanceFit = (element) => {
        if (!calledFromResize) {
            fit = false;
        }
        calledFromResize = false;
    };
    instance.on('pan', instanceFit);
    instance.on('zoom', instanceFit);

    setFiltersPrep();
}

function fitImage() {

    winSize = { height: parent.clientHeight, width: parent.clientWidth };
    var zoom = Math.min(winSize.height / image.props.height, winSize.width / image.props.width);
    var offsetX = (winSize.width - (image.props.width * zoom)) / 2;
    var offsetY = (winSize.height - (image.props.height * zoom)) / 2;

    var t = calledFromResize;
    instance.zoomAbs(0, 0, zoom);
    calledFromResize = t;
    instance.moveTo(offsetX, offsetY);
}

window.addEventListener('resize', () => {
    if (fit) {
        calledFromResize = true;
        fitImage();
    }
});

function rotateImage() {

    $('#img-panel').removeClass('rotateimg90');
    $('#img-panel').removeClass('rotateimg180');
    $('#img-panel').removeClass('rotateimg270');

    rotation = (rotation + 90) % 360;
    if (rotation != 0) {
        $('#img-panel').addClass('rotateimg' + rotation);
    }
}

function flipImage() {
    flip = !flip;
    $('#img-panel').toggleClass('flipimg');
}

function cropImage() {
    instance.pause();

    /*console.log(instance);
    const image = document.getElementById('img-panel');
    var resize = new Croppie(image, {
        viewport: { width: 100, height: 100 },
        showZoomer: false,
        enableResize: true,
        mouseWheelZoom: 'ctrl'
    });
    resize.bind({
        url: 'disgust.png',
    });*/
}

// Filters
var source;
function setFiltersPrep() {
    if(source)  
        source.onload = null;

    var parent = document.getElementById('filter-row')
    parent.textContent = '';
    if(!filters_enabled)
        return;
    source = document.createElement('img');
    source.src = 'data:image/png;base64, ' + image.smol;

    if (source.complete) {
		setTimeout(setFilters(source), 0);
    } else {
        source.onload = function () {
            setTimeout(setFilters(source), 0);
        };
    }
}

var filters = [];
loadFilters();
function loadFilters(){
    filters.push(LenaJS.default);
    filters.push(LenaJS.red);
    filters.push(LenaJS.green);
    filters.push(LenaJS.blue);
    filters.push(LenaJS.grayscale);
    filters.push(LenaJS.highpass);
    filters.push(LenaJS.gaussian);
    filters.push(LenaJS.roberts);
    filters.push(LenaJS.saturation);
    filters.push(LenaJS.sepia);
    filters.push(LenaJS.invert);
    filters.push(LenaJS.sharpen);
}
async function setFilters(source){

    var parent = document.getElementById('filter-row')
    var data = LenaJS.getImage(source);
    for(var i = 0; i < filters.length; i++){
        var temp = new ImageData(data.width, data.height)
        temp.data.set(data.data)
        var filtered_data = filters[i](temp);
        filtered_data = getBase64(filtered_data);
        var node = document.createElement('img');
        node.src = filtered_data;
        node.style.height = '100%';
        parent.appendChild(node);
        node.setAttribute('onclick', 'applyFilterToMain('+i+')');
    }
}

function applyFilterToMain(id){
    var imageContainer = document.getElementById('img-panel')
    var source = document.createElement('img');
    source.src = 'data:image/png;base64, ' + image.base64;
    var data = LenaJS.getImage(source);
    var filtered_data = filters[id](data);
    filtered_data = getBase64(filtered_data);
    imageContainer.src = filtered_data;
}

function getBase64(idata) {
    var c = document.createElement('canvas');
    c.width = idata.width;
    c.height = idata.height;

    var ctx = c.getContext('2d');
    ctx.putImageData(idata, 0, 0);
    return c.toDataURL("image/png")
}

document.onkeydown = function myKeyPress(e) {
    var keynum;
    if (window.event) { // IE                    
        keynum = e.keyCode;
    } else if (e.which) { // Netscape/Firefox/Opera                   
        keynum = e.which;
    }
    if (keynum == 37 || keynum == 39)
        ipc.send('keyEvent', keynum);
}
window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

// IPC calls

ipc.on('openFolder', function (event, folder) {
    const output = {};
    let current;
    var ind = 1;
    for (const img of folder.images) {
        current = output;
        var imagePath = img.path.split('\\')
        var len = imagePath.length;
        var count = 0;
        for (const segment of imagePath) {
            count++;
            if (segment !== '') {
                if (!('children' in current))
                    current.children = [];
                if (current.children.findIndex(element => element.text == segment) == -1) {
                    var newNode = { text: segment }
                    newNode['state'] = { 'disabled': true }
                    if (count == len) {
                        newNode = { id: ind, text: segment }
                        if (ind == folder.index + 1) {
                            newNode['state'] = { 'selected': true }
                        }
                        ind++;
                    }
                    current.children.push(newNode);
                }
                var index = current.children.findIndex(element => element.text == segment);
                current = current.children[index];
            }
        }
    }
    var top = output;
    var totalPath = folder.path.split('\\');
    for (var segment of totalPath) {
        top = top.children[0];
    }

    var tree = {
        core: {
            'data': [top],
            'keyboard': { 'right': false, 'left': false, 'up': false, 'down': false },
            'themes': {
                name: 'default-dark',
                icons: false,
                dots: false,
            }
        }
    };
    treeInstance = $('#tree-container')
    treeInstance.jstree(tree)

    treeInstance.bind("loaded.jstree", function (event, data) {
        $(this).jstree("open_all");
    });
    treeInstance.bind("refresh.jstree", function (event, data) {
        $(this).jstree("open_all");
    });
    treeInstance.bind("select_node.jstree", function (event, data) {
        if (data.onlyUpdate)
            $(this).jstree('select_node', data.index);
        if (data.event) {
            if (data.node.id[0] == 'j')
                return;
            ipc.send('imageChange', data.node.id - 1)
        }
    });

    treeInstance.jstree(true).settings.core.data = [top];
    treeInstance.jstree(true).refresh();
    treeInstance.jstree('open_all');

});

ipc.on('fit', function (event, image) {
    fit = !fit;
    if (fit) {
        calledFromResize = true;
        fitImage();
    }
});

ipc.on('openFile', function (event, image) {
    loadFile(image);
});

ipc.on('rotateImage', function (event, data) {
    rotateImage()
});

ipc.on('toggle-filters', function (event, data) {
    filters_enabled = !filters_enabled;
    if(filters_enabled)
        setFiltersPrep()

});

ipc.on('flipImage', function (event, data) {
    flipImage()
});
ipc.on('cropImage', function (event, data) {
    cropImage()
});
ipc.on('saveImage', function (event, data){
    var imageContainer = document.getElementById('img-panel')
    console.log(data)
    if(data == null){
        console.log("Bruh")
        data = image.path;
    }
    var obj = {
        flip: flip,
        rotation: rotation,
        base64: imageContainer.src,
        path: data
    };
    console.log(obj)
    ipc.send('saveImage', obj);
});
