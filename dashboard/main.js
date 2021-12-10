const { app, BrowserWindow, ipcMain, ipcRenderer } = require('electron');
const path = require('path');
const mysql = require('mysql');
const { title } = require('process');
const nodemailer = require('nodemailer');
const { forEach } = require('lodash');
const dotenv = require('dotenv').config()
const request = require('request').defaults({ encoding: null });
const cloudinary = require('cloudinary').v2;
const { stat } = require('fs');
//config

//config
let currentUser = {}

var mailTo = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: '',
    subject: '',
    text: '',
    encoding: 'base64',
    attachments: []
};

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

    ipcMain.on("reload", function (e) {
        setTimeout(() => {
            win.reload()
        }, 2000);
    })

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
            })
            connection.release();
        });
    })
    ipcMain.on("loadTickets", function(e) {
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('SELECT * FROM messages WHERE status = "open"', (err, rows) => {
                if(err) throw err;
                rows.forEach(element => {
                    var status = ""
                    connection.query('SELECT status FROM log WHERE ticket_id = ? ORDER BY id DESC limit 1',[element.id], (err, rows) => {
                            if(err) throw err;
                            if (rows.length > 0) {
                                status = rows[0].status
                            }
                            e.sender.send("ticketsLoadedReply", {
                                id: element.id, 
                                from: element.email,
                                title: element.title,
                                message: element.message, 
                                status: element.status,
                                phonenum: element.phonenum,
                                date: element.date,
                                name: element.name,
                                log_status: status,
                                status_read: element.status_read
                            })
                    });
                });
            })
            connection.release();
        });
    })
    ipcMain.on("setStatus", function(e, obj) {
        pool.getConnection((err, connection) => {
            if(err) throw err;
            connection.query("UPDATE log SET status = 'read' WHERE ticket_id = ? AND status = 'unread'",[obj.id], (err, rows) => {
                if(err) throw err;
            })
            connection.query("UPDATE messages SET status_read = 'read' WHERE id = ? AND status_read = 'unread'",[obj.id], (err, rows) => {
                if(err) throw err;
            })
        });
    })
    ipcMain.on("sendMessage", function(e, obj) {
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('INSERT INTO log (ticket_id, message_from, message_text) VALUES (?, ?, ?)',[obj.id, 'vg1im.alesundvgs@gmail.com', obj.message], (err, rows) => {
                if(err) throw err;
                if (obj.path.length > 0) {
                    imgArray = []
                    var bar = new Promise((resolve, reject) => {
                        obj.path.forEach((element, index, array) => {
                            cloudinary.uploader.upload(element, function(error, result) {
                                imgArray.push(result.url)
                                if(error) throw error;
                                connection.query('SELECT id FROM log ORDER BY id DESC LIMIT 1', (err, rows) => {
                                    if(err) throw err;
                                    connection.query('INSERT INTO attachments (log_id, path) VALUES (?, ?)',[rows[0].id, result.url], (err, rows) => {
                                        if(err) throw err;
                                        if (index === array.length -1) resolve();
                                    });
                                })
                            });
                        });
                    });
                    bar.then(() => {
                        mailTo.text = obj.message
                        mailTo.to = obj.email
                        attachmentsArray = []
                        if (imgArray.length > 0) {
                            var far = new Promise((resolve, reject) => {
                                imgArray.forEach((element, index, array) => {
                                    request.get(element, function (error, response, body) {
                                        var fileName = element.split("/").pop()
                                        if (!error && response.statusCode == 200) {
                                            attachmentsArray.push({filename: fileName, content: Buffer.from(body)})
                                            if (index === array.length -1) resolve();
                                        }
                                    });
                                });
                            })
                        } 
                        far.then(() => {
                            mailTo.attachments = attachmentsArray
                            transporter.sendMail(mailTo, function(error, info){
                                if (error) throw error;
                                console.log("Email sent: " + info.response);   
                            });
                        })
                    })
                }
            })
            connection.release();
        });
    })
    ipcMain.on("loadMessages", function(e, id){
        var title
        var desc
        var email
        var status
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('SELECT * FROM messages WHERE id = ?',[id], (err, rows) => {
                if(err) throw err;
                title = rows[0].title
                desc = rows[0].message
                email = rows[0].email
                status = rows[0].status
            })
            connection.query('SELECT * FROM log WHERE ticket_id = ?',[id], (err, rows) => {
                if(err) throw err;
                if (rows.length>0) {
                        let OldRows = rows
                        let checkForAttachments = []
                        connection.query('SELECT * FROM attachments ', (err, rows) => {
                            if(err) throw err;
                            if (rows.length > 0) {
                                for (let i = 0; i < rows.length; i++) {
                                    checkForAttachments.push({messageId: rows[i].log_id, path: rows[i].path})
                                }
                            }
                            OldRows.forEach(element => {
                                let attachments = []
                                let message_id = element.id
                                if (checkForAttachments.length > 0) {
                                    checkForAttachments.forEach(element => {
                                        if (element.messageId == message_id) {
                                            attachments.push({messageId: element.messageId, path: element.path})
                                        }
                                    });
                                }
                                e.sender.send("logLoadedReply", {
                                    id: element.ticket_id,
                                    logID: element.id,
                                    from: element.message_from,
                                    message: element.message_text,
                                    date: element.date,
                                    elements: rows.length,
                                    title: title,
                                    description: desc,
                                    email: email,
                                    status: status,
                                    attachments: attachments,
                                    log_status: element.status
                                })
                            });
                        })
                } else {
                    e.sender.send("logLoadedReply", {
                        id: 0,
                        title: title,
                        description: desc
                    }) 
                }
            })
            connection.release();
        });
    })
    ipcMain.on("closeTicket", function(e, obj){
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query("UPDATE messages SET status = 'closed' WHERE id = ?",[obj.id], (err, rows) => {
                if(err) throw err;
                mailTo.text = "Ticket med id " + obj.id + " Har blitt stengt. Gå til helpdesk.avgs-ikt.com for å sende en ny."
                mailTo.to = obj.email
                transporter.sendMail(mailTo, function(error, info){
                    if (error) throw error;
                    console.log("Email sent: " + info.response);
                })
            })
            connection.release();
        });
    })
    ipcMain.on("refreshMessages", function(e, id) {
        let title
        let desc
        let email
        let status
        pool.getConnection((err, connection) => {
            if(err) throw err;
            console.log('connected as id ' + connection.threadId);
            connection.query('SELECT title, message, email, status FROM messages WHERE id = ?',[id], (err, rows) => {
                if(err) throw err;
                title = rows[0].title
                desc = rows[0].message
                email = rows[0].email
                status = rows[0].status
            })
            connection.query('SELECT ticket_id, message_from, message_text, length date FROM log WHERE ticket_id = ?',[id], (err, rows) => {
                if(err) throw err;
                if (rows.length>0) {
                    rows.forEach(element => {
                        e.sender.send("logLoadedReply", {
                            id: element.ticket_id,
                            from: element.message_from,
                            message: element.message_text,
                            date: element.date,
                            elements: rows.length,
                            title: title,
                            description: desc,
                            email: email,
                            status: status
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
            connection.release();
        });
    });
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