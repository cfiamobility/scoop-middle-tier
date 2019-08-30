const database = require("../config/database");
const express = require("express");
const authorization = require("../config/token-verification");
// const nodemailer = require('nodemailer');

const router = express.Router();

const reportModel = database.import("../models/reporttable");

/**
 * Creates a row in the report table and sends back a success if it is a unique report from the user
 * Otherwise, if a user is attempting to report the same post again, it sends a fail 
 */
router.post("/report-post", authorization, (request, response) => {
    const {activityId, userId, reportReason, reportBody} = request.body;
    //send the object to the savedposts table in the scoopdb database.
    reportModel
      .create({
        activityid: activityId,
        userid: userId,
        reason: reportReason,
        body: reportBody,
      })
      .then(() => {
        console.log("Post Reported");
        response.send("Success");
      }).catch(function(err) {
        console.log("Failed to report post. Post may have already been reported.")
        console.log(err.body);
        response.send("Fail");
      });
    });


/**
 * Gets user-generated report data from table and formats into an email to be sent out to review team
 */
router.get('/send-email/:activityId/:posterId/:userId',authorization,(request, response)=>{
  const activityId = request.params.activityId; 
  const posterId = request.params.posterId; 
  const userId = request.params.userId; 
  database.query('SELECT activityid, scoop.reporttable.userid, reportedfirstname, reportedlastname, reason, body, createddate, senderfirstname, senderlastname FROM scoop.reporttable\
  INNER JOIN (SELECT scoop.users.firstname AS reportedfirstname, scoop.users.lastname AS reportedlastname, scoop.users.userid AS posterid FROM scoop.users) t0 ON t0.posterid = :posterid \
  INNER JOIN (SELECT scoop.users.firstname AS senderfirstname, scoop.users.lastname AS senderlastname, scoop.users.userid AS userid FROM scoop.users) t1 ON scoop.reporttable.userid = t1.userid \
  WHERE scoop.reporttable.activityid = :activityid AND scoop.reporttable.userid = :userid',
  {replacements: {activityid: activityId, posterid: posterId, userid: userId}, type: database.QueryTypes.SELECT})
  .then(results=>{
      console.log("retrieving report");
      console.log(results[0]);
      response.send(results[0]);

    /**
     * Unable to successfully authorize authentication, assuming it may be because of network firewalls 
     * Once test environment set up (no longer blocked by network issues), please uncomment and test 
     */

    // var transporter = nodemailer.createTransport(
    //     {
    //     host: "smtp-mail.outlook.com", // hostname
    //     secureConnection: false, // TLS requires secureConnection to be false
    //     port: 587, // port for secure SMTP
    //     auth: {
    //         user: "",
    //         pass: ""
    //     },
    //     tls: {
    //         ciphers:'SSLv3'
    //     },
    //     requireTLS:true,
    // });

    // let mailOptions = {
    //     from: 'josh.chan4@canada.ca,
    //     to: 'edison.mendoza@canada.ca',
    //     subject: 'Sending Email using Node.js',
    //     html: '<h1>Welcome</h1><p>That was easy!</p>'
    // };
      
    //   transporter.sendMail(mailOptions, function(error, info){
    //     if (error) {
    //       console.log(error);
    //     } else {
    //       console.log('Email sent: ' + info.response);
    //       console.log('Message sent successfully!');
    //       console.log(nodemailer.getTestMessageUrl(info));
  
    //       // only needed when using pooled connections
    //       transporter.close();
    //     }


      });
  });





module.exports = router;
