const fs = require("fs"); //instantiate file system
const express = require("express"); //instantiate express
const database = require("../config/database"); //import database
const authorization = require("../config/token-verification"); // importing token authorization function
const router = express.Router(); //create a router

/**
 * Description: used to get notifications within the last 24 hours
 */

router.get("/today/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in
   
    database.query('SELECT notificationid, scoop.notifications.userid AS posterid, activityid, modifieddate, likesid, likesuserid, liketype, activitytype, activityreference,\
    COALESCE (likesnotifier.firstname, commentnotifier.firstname) AS firstname, coalesce (likesnotifier.lastname, commentnotifier.lastname) AS lastname FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid, scoop.likes.liketype as liketype FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.activitytype AS activitytype, scoop.postcomment.activityreference AS activityreference,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    {replacements:{id:userid}, type:database.QueryTypes.SELECT})
    .then(results=>{
        results = results.filter(o => Object.keys(o).length); 
        console.log(results);
        console.log("Number of today notfications for this user: " + results.length)
        response.send(results); //sends results back after select statement
    });
})


router.get("/today/images/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in
    database.query('SELECT notificationid, scoop.notifications.userid AS posterid, activityid, modifieddate, likesid, likesuserid, postimage,\
    COALESCE (likesnotifier.profileimage, commentnotifier.profileimage) AS profileimage FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.postimagepath AS postimage,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    {replacements:{id:userid}, type:database.QueryTypes.SELECT})
    .then(results=>{
      results = results.filter(o => Object.keys(o).length); 
        for(i=0; i< results.length; i++){
            if(results[i].postimage != null && results[i].postimage != ""){ //checks if activity profile image is not null
                var postImagePath = results[i].postimage; //gets the image path of the postimagepath
                var postImageFile = fs.readFileSync(postImagePath); //reads the image path and stores the file into a variable
                var postbase64data = postImageFile.toString('base64'); //converts the image file to a string
                results[i].postimage = postbase64data; //saves it into the results postimagepath
  
                var userImagePath = results[i].profileimage; //gets the image path of the activity profile image
                var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
                var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
                results[i].profileimage = userbase64data; //saves it into the results activity profile image

            }else{ //checks if likes profile image is not null
                var userImagePath = results[i].profileimage; //gets the image path of the activity profile image
                var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
                var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
                results[i].profileimage = userbase64data; //saves it into the results activity profile image
            }
        }
        response.send(results); //sends results back after for loop
      }
    )
  });



/**
 * Description: used to get notifications after 24 hours
 */
router.get('/recent/:id', (request, response)=>{
    const userid = request.params.id; //gets the user id passed in
   
    database.query('SELECT notificationid, scoop.notifications.userid AS posterid, activityid, modifieddate, likesid, likesuserid, liketype, activitytype, activityreference,\
    COALESCE (likesnotifier.firstname, commentnotifier.firstname) AS firstname, coalesce (likesnotifier.lastname, commentnotifier.lastname) AS lastname FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid, scoop.likes.liketype as liketype FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.activitytype AS activitytype, scoop.postcomment.activityreference AS activityreference,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    {replacements:{id:userid}, type:database.QueryTypes.SELECT})
    .then(results=>{
        results = results.filter(o => Object.keys(o).length); 
        console.log(results);
        console.log("Number of recent notfications for this user: " + results.length)
        response.send(results); //sends results back after select statement
    });
});

// Description of SELECT statement: Selects notifications after 24 hours which is left joined on activity ids with a table made of the activities joined with the person who performed the activity \
//                                  which is then left joined on like ids with a table made of likes joined with activities they liked joined with the users who performed the like


// 'SELECT scoop.postcomment.postimagepath AS postimagepath, scoop.users.profileimage AS profileimage FROM scoop.postcomment \
// INNER JOIN scoop.users ON scoop.postcomment.userid = scoop.users.userid\
// INNER JOIN scoop.savedposts ON scoop.savedposts.activityid = scoop.postcomment.activityid\
// WHERE scoop.postcomment.activitytype = 1 AND scoop.savedposts.activestatus = 1 AND scoop.savedposts.userid = :id\
// ORDER BY scoop.savedposts.modifieddate DESC'


/**
 * Description: used to get images after 24 hours
 */
router.get("/recent/images/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in
    database.query('SELECT notificationid, scoop.notifications.userid AS posterid, activityid, modifieddate, likesid, likesuserid, postimage,\
    COALESCE (likesnotifier.profileimage, commentnotifier.profileimage) AS profileimage FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.postimagepath AS postimage,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    {replacements:{id:userid}, type:database.QueryTypes.SELECT})
    .then(results=>{
      results = results.filter(o => Object.keys(o).length); 
        for(i=0; i< results.length; i++){
          if(results[i].postimage != null && results[i].postimage != ""){ //checks if activity profile image is not null
            var postImagePath = results[i].postimage; //gets the image path of the postimagepath
            var postImageFile = fs.readFileSync(postImagePath); //reads the image path and stores the file into a variable
            var postbase64data = postImageFile.toString('base64'); //converts the image file to a string
            results[i].postimage = postbase64data; //saves it into the results postimagepath

            var userImagePath = results[i].profileimage; //gets the image path of the activity profile image
            var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
            var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
            results[i].profileimage = userbase64data; //saves it into the results activity profile image

          }else{ //checks if likes profile image is not null
            var userImagePath = results[i].profileimage; //gets the image path of the activity profile image
            var userImageFile = fs.readFileSync(userImagePath); //reads the image path and stores the file into a variable
            var userbase64data = userImageFile.toString('base64'); //converts the image file to a string
            results[i].profileimage = userbase64data; //saves it into the results activity profile image
          }
        }
        response.send(results); //sends results back after for loop
      }
    )
});

module.exports = router;
