const fs = require("fs"); //instantiate file system
const express = require("express"); //instantiate express
const database = require("../config/database"); //import database
const authorization = require("../config/token-verification"); // importing token authorization function
const router = express.Router(); //create a router

/**
 * DESCRIPTION: Get today's (within 24 hours) notifications data for the given userid
 *              **A notification is created by either a like or a comment action**
 */
router.get("/today/:id", authorization, (request, response) => {
  const userid = request.params.id;
  /**
   * SELECT Statement Breakdown: Can be broken into 2 main components - select likes and select comments, then coalesce for first and last names
   *                            **Coalesce takes the first parameter that is not null as the value for firstname and lastname.**
   *    Note: We select the first and last names and join the tables on userid twice (once for likes and once for comments).
   *          The reason for doing this is because in some rows of the table the likeid may be null (thus, it is a comment notification), this leads to null values for firstname and lastname 
   *          This allows us to take a valid first and last name for either a like or comment notification.
   * **Highly recommend testing by creating a notifcation and viewing the console log for the final table results**
   * Note: liketype is always 1 for a like in this case because a dislike causes the active status to be 0 in the notification table, and is not selected based on our query conditions
   * Note: If the activity type is a 2 (comment), it is a always a like - users can only perform a like on a comment
   */
  database.query(
    'SELECT\
      notificationid, scoop.notifications.userid AS notifierid,\
      activityid, modifieddate,\
      likesid, likesuserid, liketype,\
      activitytype, activityreference,\
      COALESCE\
        (likesnotifier.firstname, commentnotifier.firstname) AS firstname,\
      COALESCE\
        (likesnotifier.lastname, commentnotifier.lastname) AS lastname\
    FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid, scoop.likes.liketype as liketype FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.activityreference AS activityreference, scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid,\
      scoop.postcomment.activitytype AS activitytype FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    { replacements: { id: userid }, type: database.QueryTypes.SELECT })
    .then(results => {
      results = results.filter(o => Object.keys(o).length);
      console.log(results);
      console.log("Number of today notfications for this user: " + results.length)
      response.send(results); //sends results back after select statement
    });
})

/**
 * DESCRIPTION: Get today's (within 24 hours) notifications image data for the given userid
 *              **A notification is created by either a like or a comment action**
 *              **The notifier is considered to be the user causing the notification**
 */
router.get("/today/images/:id", authorization, (request, response) => {
  const userid = request.params.id;
   /**
   * SELECT Statement Breakdown: Can be broken into 2 main components - select likes and select comments, then coalesce for the notifier's profile image
   *                            **Coalesce takes the first parameter that is not null as the value for profileimage**
   *    Note: We select profileimage and join the tables on userid twice (once for likes and once for comments).
   *          The reason for doing this is because in some rows of the table the likeid may be null (thus, it is a comment notification), this leads to null values for profileimage
   *          This allows us to take a valid profileimage for either a like or comment notification.
   * **Highly recommend testing by creating a notifcation and viewing the console log for the final table results**
   * Note: postimage may be null or empty because not all activities have an image 
   */
  database.query(
    'SELECT\
      notificationid, scoop.notifications.userid AS notifierid,\
      activityid, modifieddate,\
      likesid, likesuserid,\
      postimage,\
      COALESCE (likesnotifier.profileimage, commentnotifier.profileimage) AS profileimage\
    FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.postimagepath AS postimage,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    { replacements: { id: userid }, type: database.QueryTypes.SELECT })
    .then(results => {
      results = results.filter(o => Object.keys(o).length);
      for (i = 0; i < results.length; i++) {
        if (results[i].postimage != null && results[i].postimage != "") { //checks if activity post image is not null
          var postImagePath = results[i].postimage; //gets the image path of the postimagepath
          var postImageFile = fs.readFileSync(postImagePath); //reads the image path and stores the file into a variable
          var postbase64data = postImageFile.toString('base64'); //converts the image file to a string
          results[i].postimage = postbase64data; //saves it into the results postimagepath

          var userImagePath = results[i].profileimage; //gets the image path of the notifier's profile image
          var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
          var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
          results[i].profileimage = userbase64data; //saves it into the results notifier's profile image

        } else { // otherwise, only gets the profile image, because no post image exists
          var userImagePath = results[i].profileimage; //gets the image path of the notifier's profile image
          var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
          var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
          results[i].profileimage = userbase64data; //saves it into the results notifier's profile image
        }
      }
      response.send(results); //sends results back after for loop
    }
    )
});



/**
 * DESCRIPTION: Get recent (24 hours to 504 hours (3 weeks)) notifications data for the given userid
 *              **A notification is created by either a like or a comment action**
 */
router.get('/recent/:id', (request, response) => {
  const userid = request.params.id; 
 /**
   * SELECT Statement Breakdown: Can be broken into 2 main components - select likes and select comments, then coalesce for first and last names
   *                            **Coalesce takes the first parameter that is not null as the value for firstname and lastname.**
   *    Note: We select the first and last names and join the tables on userid twice (once for likes and once for comments).
   *          The reason for doing this is because in some rows of the table the likeid may be null (thus, it is a comment notification), this leads to null values for firstname and lastname 
   *          This allows us to take a valid first and last name for either a like or comment notification.
   * **Highly recommend testing by creating a notifcation and viewing the console log for the final table results**
   * Note: liketype is always 1 for a like in this case because a dislike causes the active status to be 0 in the notification table, and is not selected based on our query conditions
   * Note: If the activity type is a 2 (comment), it is a always a like - users can only perform a like on a comment
   */
  database.query(
    'SELECT\
      notificationid, scoop.notifications.userid AS notifierid,\
      activityid, modifieddate,\
      likesid, likesuserid, liketype,\
      activitytype, activityreference,\
      COALESCE\
        (likesnotifier.firstname, commentnotifier.firstname) AS firstname,\
      COALESCE\
        (likesnotifier.lastname, commentnotifier.lastname) AS lastname\
    FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid, scoop.likes.liketype as liketype FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.activitytype AS activitytype, scoop.postcomment.activityreference AS activityreference,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'504 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    { replacements: { id: userid }, type: database.QueryTypes.SELECT })
    .then(results => {
      results = results.filter(o => Object.keys(o).length);
      console.log(results);
      console.log("Number of recent notfications for this user: " + results.length)
      response.send(results); //sends results back after select statement
    });
});

/**
 * DESCRIPTION: Get recent (24 hours to 504 hours (3 weeks)) notifications image data for the given userid
 *              **A notification is created by either a like or a comment action**
 *              **The notifier is considered to be the user causing the notification**
 */
router.get("/recent/images/:id", authorization, (request, response) => {
  const userid = request.params.id; 
  /**
   * SELECT Statement Breakdown: Can be broken into 2 main components - select likes and select comments, then coalesce for the notifier's profile image
   *                            **Coalesce takes the first parameter that is not null as the value for profileimage**
   *    Note: We select profileimage and join the tables on userid twice (once for likes and once for comments).
   *          The reason for doing this is because in some rows of the table the likeid may be null (thus, it is a comment notification), this leads to null values for profileimage
   *          This allows us to take a valid profileimage for either a like or comment notification.
   * **Highly recommend testing by creating a notifcation and viewing the console log for the final table results**
   * Note: postimage may be null or empty because not all activities have an image 
   */
  database.query(
    'SELECT\
      notificationid, scoop.notifications.userid AS notifierid,\
      activityid, modifieddate,\
      likesid, likesuserid,\
      postimage,\
    COALESCE\
      (likesnotifier.profileimage, commentnotifier.profileimage) AS profileimage\
    FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.postimagepath AS postimage,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'504 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    { replacements: { id: userid }, type: database.QueryTypes.SELECT })
    .then(results => {
      results = results.filter(o => Object.keys(o).length);
      for (i = 0; i < results.length; i++) {
        if (results[i].postimage != null && results[i].postimage != "") { //checks if activity profile image is not null
          var postImagePath = results[i].postimage; //gets the image path of the postimagepath
          var postImageFile = fs.readFileSync(postImagePath); //reads the image path and stores the file into a variable
          var postbase64data = postImageFile.toString('base64'); //converts the image file to a string
          results[i].postimage = postbase64data; //saves it into the results postimagepath

          var userImagePath = results[i].profileimage; //gets the image path of the notifier's profile image
          var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
          var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
          results[i].profileimage = userbase64data; //saves it into the results notifier's profile image

        } else { // otherwise, only gets the profile image, because no post image exists
          var userImagePath = results[i].profileimage; //gets the image path of the notifier's profile image
          var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
          var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
          results[i].profileimage = userbase64data; //saves it into the results notifier's profile image
        }
      }
      response.send(results); //sends results back after for loop
    }
    )
});

module.exports = router;
