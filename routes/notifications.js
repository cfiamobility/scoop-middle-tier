const fs = require("fs"); //instantiate file system
const express = require("express"); //instantiate express
const database = require("../config/database"); //import database
const authorization = require("../config/token-verification"); // importing token authorization function
const router = express.Router(); //create a router

/**
 * **DESCRIPTION: Used to get notifications within the last 24 hours**
 * **CONDITIONS: notifications userid matches given parameter userid, notifications with a modifieddate of less than 24 hrs, notifications with an active status of 1**
 * **SELECT Statement Breakdown: Can be broken into 2 main components - likes and comments, coalesces first and last names, because likesid may be null**
 * 
 *    Selects the relevant columns from the NOTIFICATIONS table and the LIKES table, then does a left join on the likeid's (matching primary and foreign keys)
 *    -> This allows for us to get a table with the userid of the person who created the like (notifier) and its liketype 
 *    **Note: liketype is always 1 for a like in this case because a dislike causes the active status to be 0 in the notification table, and it is not selected based on our conditions**
 *        Selects the first name and last name from the USER table and then does another left join on the userid's (matching primary and foreign keys)
 *        -> This allows for us to to get a table with the first name and last name of the notifier (may be null if its a comment)
 * 
 *    Selects the relevant columns from the POSTCOMMENT table and does a left join on the activityid's (matching primary and foreign keys)
 *    -> This allows for us to get a table with the userid of the person who created the comment (notifier) and its reference activity id
 *    -> Conveniently, we also get the activity type, helping us determine whether this notifcation action was performed on a comment or a post 
 *    **Note: If the activity type is a 2 (comment), it is a always a like - users can only perform a like on a comment**
 *        Selects the first name and last name from the USER table and then does another left join on the userid's (matching primary and foreign keys)
 *        -> This allows for us to to get a table with the first name and last name of the notifier (may be null if it's a like)
 * 
 *    Note that we select the first and last names and join the tables on userid twice. The reason for doing this is because in some rows of the table the likeid is null 
 *    (it is a comment notification), this leads to null values for first and last names
 *    Coalesce takes the first parameter that is not null as the value for firstname and lastname. 
 *    -> This allows us to take the first and last name that we selected from the second select and join for first and last name 
 *    **Note: The reason for coalescing with first and last names from likes before comments is because of the fact that we are assuming there will be more likes than comments**   
 * 
 *    Finally, order in descending of moddified date gives us the most recent notifications at the top
 * 
 * **Highly recommend testing through creating a notifcation and viewing the console log for the final table results**
 */
router.get("/today/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in
   
    database.query('SELECT notificationid, scoop.notifications.userid AS notifierid, activityid, modifieddate, likesid, likesuserid, liketype, activitytype, activityreference,\
    COALESCE (likesnotifier.firstname, commentnotifier.firstname) AS firstname, coalesce (likesnotifier.lastname, commentnotifier.lastname) AS lastname FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid, scoop.likes.liketype as liketype FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.activityreference AS activityreference, scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid,\
      scoop.postcomment.activitytype AS activitytype FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
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

/**
 * **DESCRIPTION: Used to get the images of notifications within the last 24 hours, including Profile Images and possible Post Images**
 * **CONDITIONS: notifications userid matches given parameter userid, notifications with a modifieddate of less than 24 hrs, notifications with an active status of 1**
 * **SELECT Statement Breakdown: Similar to /today/:id, can be broken into 2 main components - likes and comments, coalesces profileimages because likesid may be null**
 *    
 *     Selects the relevant columns from the NOTIFICATIONS table and the LIKES table, then does a left join on the likeid's (matching primary and foreign keys)
 *    -> This allows for us to get a table with the userid of the person who created the like (notifier) and its liketype 
 *    **Note: liketype is always 1 for a like in this case because a dislike causes the active status to be 0 in the notification table, and it is not selected based on our conditions**
 *        Selects the profileimage from the USER table and then does another left join on the userid's (matching primary and foreign keys)
 *        -> This allows for us to to get a table with the profileimage of the notifier (may be null if its a comment)
 * 
 *    Selects the relevant columns from the POSTCOMMENT table and does a left join on the activityid's (matching primary and foreign keys)
 *    -> This allows for us to get a table with the userid of the person who created the comment (notifier)
 *    **Note: It is unnecessary to get the activitytype and reference activityid in this case, instead we grab smomething more relevant - postimagepath**
 *        Selects the profileimage from the USER table and then does another left join on the userid's (matching primary and foreign keys)
 *        -> This allows for us to to get a table with the profileimage of the notifier (may be null if it's a like)
 * 
 *    Similar to /today/:id, we select the profileimages and join the tables on userid twice. The reason for doing this is because in some rows of the table the likeid is null 
 *    (it is a comment notification), this leads to null values for the profileimages
 *    Coalesce takes the first parameter that is not null as the value for profileimage
 *    -> This allows us to take the profileimage that we selected from the second select and join for first and last name 
 *    **Note: The reason for coalescing with profileimages from likes before comments is because of the fact that we are assuming there will be more likes than comments**   
 * 
 *    Finally, order in descending of moddified date gives us the most recent notifications at the top
 * 
 * **Note: We choose not to log the results for image getting functions because the base-64 strings for the images are very long**
 *    
 */
router.get("/today/images/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in
    database.query('SELECT notificationid, scoop.notifications.userid AS notifierid, activityid, modifieddate, likesid, likesuserid, postimage,\
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
   
    database.query('SELECT notificationid, scoop.notifications.userid AS notifierid, activityid, modifieddate, likesid, likesuserid, liketype, activitytype, activityreference,\
    COALESCE (likesnotifier.firstname, commentnotifier.firstname) AS firstname, coalesce (likesnotifier.lastname, commentnotifier.lastname) AS lastname FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid, scoop.likes.liketype as liketype FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.activitytype AS activitytype, scoop.postcomment.activityreference AS activityreference,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.firstname AS firstname, scoop.users.lastname AS lastname FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'504 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    {replacements:{id:userid}, type:database.QueryTypes.SELECT})
    .then(results=>{
        results = results.filter(o => Object.keys(o).length); 
        console.log(results);
        console.log("Number of recent notfications for this user: " + results.length)
        response.send(results); //sends results back after select statement
    });
});

/**
 * Description: used to get images after 24 hours
 */
router.get("/recent/images/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in
    database.query('SELECT notificationid, scoop.notifications.userid AS notifierid, activityid, modifieddate, likesid, likesuserid, postimage,\
    COALESCE (likesnotifier.profileimage, commentnotifier.profileimage) AS profileimage FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.postimagepath AS postimage,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'504 HOURS\' AND scoop.notifications.activestatus = 1\
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
