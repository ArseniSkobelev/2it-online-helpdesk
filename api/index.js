require('dotenv').config()
const nodemailer = require('nodemailer');
const mysql = require('mysql');
const fs = require('fs');
const cors = require('cors')
const imaps = require('imap-simple');
const Imap = require('imap')
const Promise = require("bluebird");
const simpleParser = require('mailparser').simpleParser;
const _ = require('lodash');
const erp = require("node-email-reply-parser");
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });
app.use(cors())
const port = 3000

if ("development" == app.get("env")) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

app.use(express.static('attachments'))

const { json } = require('express');
const { cond } = require('lodash');

app.get("/attachments", (req, res) =>{
    res.sendFile(__dirname + "/attachments/" + req.query.attachment)
})

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
});

const pool = mysql.createPool({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_DATABASE
});

var config = {
    imap: {
        user: process.env.EMAIL_USER,
        password: process.env.EMAIL_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
    }
};
var imapConfig = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
};
var imap = new Imap(imapConfig);
Promise.longStackTraces();
imap.once("ready", execute);

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
});

var mailFrom = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: 'vg1im.alesundvgs@gmail.com',
    subject: 'New support ticket submitted with id',
    text: 'Check dashboard for more info',
    encoding: 'base64'
};
var mailTo = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: 'vg1im.alesundvgs@gmail.com',
    subject: 'New support ticket submitted with id',
    text: '',
    encoding: 'base64'
};
var respondFile = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: '',
    subject: 'Filtype ikkje støttet',
    text: 'Filtypen du sendte er ikkje støttet. Vennligst send som png, jpg, jpeg eller gif',
    encoding: 'base64'
};
  
app.post('/form', function (req, res) {
    pool.getConnection((err, connection) => {
        if(err) throw err;
        console.log('connected as id ' + connection.threadId);
        connection.query('INSERT INTO messages (name, email, title, message, phonenum, avdeling) VALUES (?, ?, ?, ?, ?, ?)',[
            req.query.name,
            req.query.email,
            req.query.title,
            req.query.message,
            req.query.phonenum,
            req.query.avdeling
        ], (err, rows) => {
            io.sockets.emit("updateTickets")
            // call email func
            if(err) {
                res.status(500).send("Something went wrong with updating database")
                throw err
            }
            console.log('Database updated succsexfully');
            
            connection.query("SELECT * FROM messages WHERE message = ? LIMIT 1", [req.query.message], (err, rows) =>{
                mailTo.to = req.query.email
                mailFrom.subject = "Ticket submited with id #" + rows[0].id;
                mailTo.subject = "Ticket submited with id #" + rows[0].id;
                mailFrom.text = req.query.message + "\n Check dashboard for more info";
                mailTo.text = "Your message: " + req.query.message;
                transporter.sendMail(mailFrom, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("Email sent: " + info.response);
                        console.log(mailFrom)
                    }
                });
                transporter.sendMail(mailTo, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("Email sent: " + info.response);
                        console.log(mailTo)
                    }
                });
            })
            res.status(200).send("Database updated succsexfully")
            connection.release(); 
        });
    });    
})

app.post('/update', function (req, res) {
    updateTickets();
    res.status(200).send("Updated messages yes")
})

io.on("connection", (socket) => {
    console.log(socket.id)
});

imap.connect();
function execute() {
    scanInbox()
    imap.openBox("INBOX", false, function(err, mailBox) {
        if (err) {
            console.error(err);
            return;
        }
        imap.on("mail", scanInbox)
    })
}
function scanInbox() {
    console.log("Scanning Mailbox")
    imaps.connect(config).then(function (connection) {
        return connection.openBox('INBOX').then(function () {
            var searchCriteria = ['UNSEEN'];
            var fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true
            };
            connection.search(searchCriteria, fetchOptions).then(function (messages) {
                messages.forEach(function (item) {
                    var all = _.find(item.parts, { "which": "" })
                    var id = item.attributes.uid;
                    var idHeader = "Imap-Id: "+id+"\r\n";
                    simpleParser(idHeader+all.body, (err, mail) => {
                        if(err) throw err
                        pool.getConnection((err, connection) => {
                            if(err) throw err;
                            console.log('connected as id ' + connection.threadId);
                            connection.query("SELECT * FROM messages WHERE email = ? ORDER BY id DESC LIMIT 1", [mail.from.value[0].address], (err, rows) =>{
                                if (rows.length > 0) {
                                    connection.query("INSERT INTO log (ticket_id, message_from, message_text) VALUES (?, ?, ?)", [rows[0].id, rows[0].email, erp(mail.text, true)], (err, rows) =>{
                                        if (err) throw err
                                        if (mail.attachments.length > 0) {
                                            mail.attachments.forEach(element => {
                                                if (element.contentType.includes("image/")) {
                                                    fs.writeFile("./attachments/" + element.filename, element.content, function(err) {
                                                        if(err) throw err;
                                                        cloudinary.uploader.upload("./attachments/" + element.filename, function(err, result) {
                                                            if(err) throw err;
                                                            connection.query('INSERT INTO attachments (log_id, path) VALUES (?, ?)',[rows.insertId, result.url], (err, rows) => {
                                                                if(err) throw err;
                                                                fs.unlink("./attachments/" + element.filename, (err) => {
                                                                    if(err) throw err
                                                                })
                                                            });
                                                        })
                                                    })
                                                } else {
                                                    respondFile.to = email
                                                    transporter.sendMail(respondFile, function(error, info){
                                                        if (error) {
                                                            console.log(error);
                                                        } else {
                                                            console.log("Email sent: " + info.response);
                                                            console.log(mailFrom)
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    })
                                io.sockets.emit("updatedMessages", rows[0].id)
                                }
                            })
                            connection.release(); 
                        });
                    });
                });
                connection.end();
                console.log("Done fetching messages")
            });
        });
    })   
}
    
httpServer.listen(port, ()=>{
    console.log(`listening at port: ${port}`)
});