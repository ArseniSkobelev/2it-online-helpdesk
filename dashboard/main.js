require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mysql = require('mysql');
const { title } = require('process');
const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
});

require('electron-reload')(__dirname, {
    // Note that the path to electron may vary according to the main file
    electron: require(`${__dirname}/node_modules/electron`)
});

let currentUser = {}

var mailTo = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: '',
    subject: '',
    text: '',
    encoding: 'base64'
};


const pool = mysql.createPool({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_DATABASE
});

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

    ipcMain.on("authenticated", (event, arg) => {
        // win.loadFile('./src/index.html');
        loginData = arg;

        user = loginData['username']
        psw = loginData['password']

        currentUser = loginData['username']
        mailTo.subject = 'Helpdesk - ' + currentUser, 

        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('SELECT * FROM users WHERE username=?',[user], (err, rows) => {
                connection.release();
                if (rows.length == 1) {
                    userPsw = rows[0].password;
                    if(psw == userPsw) {
                        win.loadFile(`./src/index.html`)
    
                    } else {
                        win.loadFile(`./src/login.html`)
                    }
                }else {
                    win.loadFile(`./src/login.html`)
                }
            });
        });
    })
    ipcMain.on("indexLoaded", function(e){
        e.sender.send("indexLoadedReply", currentUser)

        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('SELECT * FROM users WHERE username=?',[user], (err, rows) => {
                connection.release();
            })
        });
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('SELECT * FROM messages', (err, rows) => {
                if(err) throw err;
                connection.release();
                rows.forEach(element => {
                    e.sender.send("ticketsLoadedReply", {
                        id: element.id, 
                        from: element.email,
                        title: element.title,
                        message: element.message, 
                        status: element.status
                    })
                });
            })
        });
    })
    ipcMain.on("sendMessage", function(e, obj) {
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('INSERT INTO log (ticket_id, message_from, message_text) VALUES (?, ?, ?)',[obj.id, 'vg1im.alesundvgs@gmail.com', obj.message], (err, rows) => {
                if(err) throw err;
                connection.release();
            })
        });
        mailTo.text = obj.message
        mailTo.to = obj.email
        console.log(mailTo)
        transporter.sendMail(mailTo, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log("Email sent: " + info.response);
                console.log(mailTo)
            }
        });
    })
    ipcMain.on("loadMessages", function(e, id){
        var title
        var desc
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('SELECT * FROM messages WHERE id = ?',[id], (err, rows) => {
                if(err) throw err;
                title = rows[0].title
                desc = rows[0].message
                console.log(rows)
            })
            connection.query('SELECT * FROM log WHERE ticket_id = ?',[id], (err, rows) => {
                if(err) throw err;
                connection.release();
                if (rows.length>0) {
                    rows.forEach(element => {
                        e.sender.send("logLoadedReply", {
                            id: element.ticket_id,
                            from: element.message_from,
                            message: element.message_text,
                            date: element.date,
                            elements: rows.length,
                            title: title,
                            description: desc
                        })
                    });
                } else {
                    e.sender.send("logLoadedReply", {
                        id: 0,
                        title: title,
                        description: desc
                    }) 
                }
            })
        });
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

