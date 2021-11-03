require('dotenv').config()
const nodemailer = require('nodemailer');
const mysql = require('mysql');
const cors = require('cors')
const express = require('express')
const app = express()
app.use(cors())
const port = 3000

const pool = mysql.createPool({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_DATABASE
});

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
    text: 'Check dashboard for more info'
};
var mailTo = {
    from: 'helpdesk-bot@avgs-ikt.com',
    to: 'vg1im.alesundvgs@gmail.com',
    subject: 'New support ticket submitted with id',
    text: ''
};
  
app.post('/form', function (req, res) {
    pool.getConnection((err, connection) => {
        if(err) throw err;
        console.log('connected as id ' + connection.threadId);
        connection.query('INSERT INTO messages (name, email, title, message, phonenum, avdeling) VALUES (?, ?, ?, ?, ?, ?)',[
            req.query.name,
            req.query.email,
            req.query.title,
            req.query.phonenum,
            req.query.avdeling,
            req.query.message
        ], (err, rows) => {
            connection.release(); 
            // call email func
            if(err) {
                res.status(500).send("Something went wrong with updating database")
                throw err
            }
            mailTo.to = req.query.email
            console.log('Database updated succsexfully');
            setTimeout(function(){
                send_email();
            }, 10000);
            res.status(200).send("Database updated succsexfully")
        });
    });    
})

const send_email = async () => {
    pool.getConnection((err, connection) => {
        if(err) throw err;
        console.log('connected as id ' + connection.threadId);
        connection.query('SELECT * FROM messages WHERE id=(SELECT max(id) FROM messages LIMIT 1);', (err, rows) => {
            connection.release(); 
                mailFrom.subject = "Ticket submited with id #" + rows[0].id;
                mailTo.subject = "Ticket submited with id #" + rows[0].id;
                mailFrom.text = rows[0].message + "\n Check dashboard for more info";
                mailTo.text = "Your message: " + rows[0].message;
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
            if(err) {
                res.status(500).send("Something went wrong with email service")
                throw err
            }
        });
    });
}

app.listen(port, () => {
    console.log(`listening at port: ${port}`)
})