const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow () {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        }
    })

    win.loadFile(`./src/login.html`)

    ipcMain.on("unauthenticated", (event) => {
        win.loadFile(`./src/login.html`)
    })

    ipcMain.on("authenticated", async event => {
        win.loadFile('./src/index.html');

    })

}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})
