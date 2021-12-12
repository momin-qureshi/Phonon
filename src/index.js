const { app, Menu, MenuItem, BrowserWindow, dialog } = require('electron');
const ipc = require('electron').ipcMain;
const path = require('path');
const fs = require('fs');

const Image = require('./image');
const { ext, getFilenames, getFile, base64_encode } = require('./file');
const sharp = require('sharp');


app.allowRendererProcessReuse = true;
sharp.cache(false)

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

var minimal = false;

var win = null;

var currGallery = {
  path: '',
  images: [],
  index: 0
};
const storeImages = (path, imageList) => {
  currGallery.images = imageList;
  currGallery.index = 0;
  currGallery.path = path;
  sendFolderStructure();
}

const loadFolder = (path) => {
  getFilenames(path, storeImages);
}

const loadFile = (path) => {
  currGallery = {
    path: path,
    images: [getFile(path)],
    index: 0
  };
  sendFolderStructure();
}

const renderImage = () => {
  img = currGallery.images[currGallery.index];
  img.index = currGallery.index;
  img.base64 = base64_encode(img.path)
  sharp(img.path)
  .resize({ height: 320 })
  .toBuffer().then(function(outputBuffer) {
    // outputBuffer contains JPEG image data
    // no wider and no higher than 200 pixels
    // and no larger than the input image
    img.smol = outputBuffer.toString('base64');
    win.webContents.send('openFile', img);
    if (minimal)
      win.setBounds({ width: img.props.width, height: img.props.height })
    }
  );
  
}

const sendFolderStructure = () => {
  win.webContents.send('openFolder', currGallery);
  renderImage();
}
loadFolder(app.getAppPath());

const createWindow = () => {
  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  win.loadFile(path.join(__dirname, 'windows', 'gallery.html'));
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('openFolder', currGallery);
  })
};

const switchWindow = () => {
  minimal = !minimal
  var temp = new BrowserWindow({
    width: 800,
    height: 600,
    frame: !minimal,
    resizable: !minimal,
    webPreferences: {
      nodeIntegration: true
    }
  });
  win.close()
  temp.loadFile(path.join(__dirname, 'windows', minimal ? 'min.html' : 'gallery.html'));
  win = temp;
  win.webContents.on('did-finish-load', () => {
    if (!minimal)
      win.webContents.send('openFolder', currGallery);
    renderImage();
  })
}

//---------------------------------------------MENU----------------------------------------------------

function getMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    {
      label: 'File',
      submenu: [{
        label: 'Open File',
        accelerator: 'ctrl+O',
        click: () => {
          openFile();
        }
      }, {
        label: 'Open Folder',
        accelerator: 'ctrl+shift+O',
        click: () => {
          openFolder();
        }
      }, {
        label: 'Save',
        accelerator: 'ctrl+s',
        click: () => {
          saveImage();
        }
      }, {
        label: 'Save As',
        accelerator: 'ctrl+shift+s',
        click: () => {
          saveAsImage();
        }
      }, {
        label: 'Exit',
        accelerator: 'Escape',
        click: () => {
          app.quit();
        }
      }]
    },
    {
      label: 'Edit',
      submenu: [{
        label: 'Rotate',
        accelerator: 'R',
        click: () => {
          win.webContents.send('rotateImage');
        }
      },
      {
        label: 'Flip',
        accelerator: 'T',
        click: () => {
          win.webContents.send('flipImage');
        }
      },{
        label: 'Filters',
        accelerator: 'ctrl+e',
        click: () => {
          win.webContents.send('toggle-filters');
        }
      }]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fit Image',
          accelerator: 'f',
          click: () => {
            win.webContents.send('fit', null);
          }
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'h',
          click: () => {
            win.webContents.send('toggleSideBar', null);
          }
        },
        {
          label: 'Toggle View',
          accelerator: 'Space',
          click: () => {
            switchWindow();
          }
        },
        {
          role: 'toggleDevTools'
        }
      ]
    }
  ]

  var menu = new Menu.buildFromTemplate(template)
  return menu;
};
Menu.setApplicationMenu(getMenu())

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the  
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// OPEN FILE/FOLDER
function openFile() {
  dialog.showOpenDialog({
    properties: ['openFile']
  }).then((res) => {
    if(res.canceled == false)
      loadFile(res.filePaths[0]);
  })
}

function openFolder() {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then((res) => {
    if(res.canceled == false)
      loadFolder(res.filePaths[0]);
  })
}

function saveImage(){
  win.webContents.send('saveImage', null);
}

function saveAsImage(){
  dialog.showSaveDialog({
    defaultPath: currGallery.images[currGallery.index].path
  }).then((res) => {
    if(res.canceled == false){
      win.webContents.send('saveImage', res.filePath);
    }
  })
}

// INPUT
ipc.on('keyEvent', function (event, keycode) {
  if (keycode == 37) {
    currGallery.index--;
    if (currGallery.index < 0)
      currGallery.index = currGallery.images.length - 1;
    renderImage();
  }
  else if (keycode == 39) {
    currGallery.index = (currGallery.index + 1) % currGallery.images.length;
    renderImage();
  }
});

ipc.on('imageChange', function (event, data) {
  currGallery.index = data;
  renderImage();
});

ipc.on('saveImage', function (event, data) {
  const uri = data.base64.split(';base64,').pop()
  let imgBuffer = Buffer.from(uri, 'base64');
  const image = sharp(imgBuffer)
  if(data.flip == true){
    image.flop();
  }
  if(data.rotation != 0){
    image.rotate(data.rotation);
  }
  image.toFile(data.path, (err) => {
    renderImage();
  });
});


// DEBUG
ipc.on('debug', function (event, data) {
  console.log(data);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
