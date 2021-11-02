const { app, BrowserWindow } = require('electron')

function createWindow () {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080
    })

    win.loadFile('./src/index.html')
}

app.whenReady().then(() => {
    createWindow()
})