require('dotenv').config()
const nodemailer = require('nodemailer');
const mysql = require('mysql');
const fs = require('fs');
const cors = require('cors')
const express = require('express')
const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
const _ = require('lodash');
const erp = require("node-email-reply-parser");
const { v4: uuidv4 } = require('uuid');
var cloudinary = require('cloudinary').v2;
const app = express()
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
        authTimeout: 3000
    }
};

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
});

var mailFrom = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: '***REMOVED***',
    subject: 'New support ticket submitted with id',
    text: 'Check dashboard for more info',
    encoding: 'base64'
};
var mailTo = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: '***REMOVED***',
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

updateTickets();
setInterval(updateTickets, 10000)

function updateTickets() {
    console.log("Searching through email")
    imaps.connect(config).then(function (connection) {
        return connection.openBox('INBOX').then(function () {
            var searchCriteria = ['*'];
            var fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
            };
            return connection.search(searchCriteria, fetchOptions).then(function (messages) {
                messages.forEach(function (item) {
                    var all = _.find(item.parts, { "which": "" })
                    var id = item.attributes.uid;
                    var idHeader = "Imap-Id: "+id+"\r\n";
                    simpleParser(idHeader+all.body, (err, mail) => {
                        pool.getConnection((err, connection) => {
                            if(err) throw err;
                            console.log('connected as id ' + connection.threadId);
                            let mailTest = erp(mail.text, true);
                            connection.query("SELECT * FROM log WHERE message_text = ?",[mailTest], (err, rows) => {
                                if(err) throw err;
                                connection.release(); 
                                console.log("Checked matching for messages")
                                    if (rows.length == 0) {
                                        console.log("Found a non matching message")
                                        pool.getConnection((err, connection) => {
                                            if(err) throw err;
                                            console.log('connected as id ' + connection.threadId);
                                            connection.query('SELECT * FROM messages WHERE email = ? ORDER BY id DESC',[mail.from.value[0].address], (err, rows) => {
                                                if (rows.length > 0) {
                                                    var email = rows[0].email
                                                }
                                                connection.release(); 
                                                console.log("Searched for a previousely opened case with this email")
                                                if (rows.length != 0) {
                                                    console.log("Not in DB")
                                                    pool.getConnection((err, connection) => {
                                                        if(err) throw err;
                                                        console.log('connected as id ' + connection.threadId);
                                                        let mailTest = erp(mail.text, true);
                                                        connection.query('INSERT INTO log (ticket_id, message_from, message_text) VALUES (?, ?, ?)',[rows[0].id, mail.from.value[0].address, mailTest], (err, rows) => {
                                                            if (mail.attachments.length > 0) {
                                                                console.log("Added message to case")
                                                                mail.attachments.forEach(element => {
                                                                    console.log(element)
                                                                    if (element.contentType.includes("image/")) {
                                                                        fs.writeFile("./attachments/" + element.filename, element.content, function(err) {
                                                                            if(err) throw err;
                                                                            cloudinary.uploader.upload("./attachments/" + element.filename, function(error, result) {
                                                                                if(error) throw error;
                                                                                connection.query('SELECT id FROM log ORDER BY id DESC LIMIT 1', (err, rows) => {
                                                                                    if(err) throw err;
                                                                                    console.log("yes:" + rows[0].id)
                                                                                    connection.query('INSERT INTO attachments (log_id, path) VALUES (?, ?)',[rows[0].id, result.url], (err, rows) => {
                                                                                        if(err) throw err;
                                                                                        console.log("inserted attachments to db")
                                                                                    });
                                                                                })
                                                                                fs.unlink("./attachments/" + element.filename, () => {
                                                                                    console.log("succsucc")
                                                                                })
                                                                            });
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
                                                                })
                                                            }
                                                            if(err) {
                                                                throw err
                                                            }
                                                        });
                                                        connection.release();
                                                    });
                                                } else{
                                                    console.log("Already in DB")
                                                }
                                                if(err) {
                                                    throw err
                                                }
                                            });
                                        });
                                    }
                                if(err) {
                                    throw err
                                }
                            });
                        }); 
                    });
                });
                connection.end();
            });
        });
    });
}

app.listen(port, () => {
    console.log(`listening at port: ${port}`)
})