const fs = require("fs"); //instantiate file system
const express = require("express"); //instantiate express
const database = require("../config/database"); //import database
const authorization = require("../config/token-verification"); // importing token authorization function
const router = express.Router(); //create a router

/**
 * Description: used to get notifications within the last 24 hours
 */
router.get("/todaynotifs/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in

    database.query('SELECT * FROM scoop.notifications \
        LEFT JOIN (SELECT scoop.users.firstname AS activityfirstname, scoop.users.lastname AS activitylastname, scoop.users.userid AS activityuserid, scoop.users.profileimage AS activityprofileimage, \
        scoop.postcomment.activityid AS activityactivityid, scoop.postcomment.activitytype AS activityactivitytype, scoop.postcomment.activityreference AS activityactivityreference FROM scoop.postcomment \
        INNER JOIN scoop.users ON scoop.users.userid = scoop.postcomment.userid WHERE scoop.postcomment.activestatus = 1) t1 ON scoop.notifications.activityid = t1.activityactivityid \
        LEFT JOIN (SELECT scoop.users.firstname AS likesfirstname, scoop.users.lastname AS likeslastname, scoop.users.profileimage AS likesprofileimage, scoop.likes.userid AS likesuserid, scoop.likes.liketype AS likesliketype, \
        scoop.likes.likeid AS likeslikeid, s1.activityid AS likesactivityid, s1.activitytype AS likesactivitytype, s1.activityreference AS likesactivityreference, s1.activitytype AS likesactivitytype FROM scoop.likes \
        INNER JOIN scoop.postcomment s1 ON scoop.likes.activityid = s1.activityid \
        INNER JOIN scoop.users ON scoop.likes.userid = scoop.users.userid WHERE scoop.likes.activestatus = 1 AND scoop.likes.liketype=1) t2 ON scoop.notifications.likeid = t2.likeslikeid \
        WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'24 HOURS\' ORDER BY scoop.notifications.modifieddate DESC', 
    {replacements:{id:userid}, type: database.QueryTypes.SELECT})
    .then(results =>{
        for (var i = 0; i < results.length; i++){
            if(results[i].likesliketype != 1){
                delete results[i]
            }
        }
        results = results.filter(o => Object.keys(o).length); 
        console.log(results);
        response.send(results); //sends results back after select statement
    })
})
// Description of SELECT statement: Selects notifications from last 24 hours which is left joined on activity ids with a table made of the activities joined with the person who performed the activity \
//                                  which is then left joined on like ids with a table made of likes joined with activities they liked joined with the users who performed the like

/**
 * Description: used to get images from last 24 hours
 */
router.get("/todayimages/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in

    database.query('SELECT t1.activityprofileimage, t2.likesprofileimage, t2.likesliketype FROM scoop.notifications \
        LEFT JOIN (SELECT scoop.users.profileimage AS activityprofileimage, scoop.postcomment.activityid AS activityactivityid FROM scoop.postcomment \
        INNER JOIN scoop.users ON scoop.users.userid = scoop.postcomment.userid WHERE scoop.postcomment.activestatus = 1 AND scoop.users.userid != :id) t1 ON scoop.notifications.activityid = t1.activityactivityid \
        LEFT JOIN (SELECT scoop.users.profileimage AS likesprofileimage, scoop.likes.likeid AS likeslikeid, scoop.likes.liketype AS likesliketype FROM scoop.likes \
        INNER JOIN scoop.postcomment s1 ON scoop.likes.activityid = s1.activityid \
        INNER JOIN scoop.users ON scoop.likes.userid = scoop.users.userid WHERE scoop.likes.activestatus = 1 AND scoop.likes.liketype=1 AND scoop.users.userid != :id) t2 ON scoop.notifications.likeid = t2.likeslikeid \
        WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate >= NOW() - INTERVAL \'24 HOURS\' ORDER BY scoop.notifications.modifieddate DESC', 
    {replacements:{id:userid}, type: database.QueryTypes.SELECT})
    .then(results =>{
      for (var i = 0; i < results.length; i++){
        if(results[i].likesliketype != 1){
          delete results[i]
        }
      }
      results = results.filter(o => Object.keys(o).length); 
        for(i=0; i< results.length; i++){
            if(results[i].activityprofileimage != null){ //checks if activity profile image is not null
                var imagePath = results[i].activityprofileimage; //gets the image path of the activity profile image
                var imageFile = fs.readFileSync(imagePath) //reads the image path and stores the file into a variable
                var base64data = imageFile.toString('base64') //converts the image file to a string
                results[i].activityprofileimage = base64data; //saves it into the results activity profile image
            }else if(results[i].likesprofileimage != null){ //checks if likes profile image is not null
                var imagePath = results[i].likesprofileimage; //gets the image path of the likes profile image
                var imageFile = fs.readFileSync(imagePath) //reads the image path and stores the file into a variable
                var base64data = imageFile.toString('base64')  //converts the image file to a string
                results[i].likesprofileimage = base64data; //saves it in the results likes profile image
            }else{ //otherwise all the images are null
                console.log("images are all null") //logs accordingly 
            }
        }
        response.send(results); //sends results back after for loop
      })
    });

// Description of SELECT statement: Selects images from last 24 hours which is left joined on activity ids with a table made of the activities joined with the person who performed the activity \
//                                  which is then left joined on like ids with a table made of likes joined with activities they liked joined with the users who performed the like

// /**
//  * Description: used to get notifications after 24 hours
//  */
// router.get('/recentnotifs/:id', (request, response)=>{
//     const userid = request.params.id; //gets the user id passed in
   
//     database.query('SELECT * FROM scoop.notifications \
//     LEFT JOIN (SELECT scoop.users.firstname AS activityfirstname, scoop.users.lastname AS activitylastname, scoop.users.userid AS activityuserid, scoop.users.profileimage AS activityprofileimage, \
//     scoop.postcomment.activityid AS activityactivityid, scoop.postcomment.activitytype AS activityactivitytype, scoop.postcomment.activityreference AS activityactivityreference FROM scoop.postcomment \
//     INNER JOIN scoop.users ON scoop.users.userid = scoop.postcomment.userid WHERE scoop.postcomment.activestatus = 1 AND scoop.users.userid != :id) t1 ON scoop.notifications.activityid = t1.activityactivityid \
//     LEFT JOIN (SELECT scoop.users.firstname AS likesfirstname, scoop.users.lastname AS likeslastname, scoop.users.profileimage AS likesprofileimage, scoop.likes.userid AS likesuserid, scoop.likes.liketype AS likesliketype, \
//     scoop.likes.likeid AS likeslikeid, s1.activityid AS likesactivityid, s1.activitytype AS likesactivitytype, s1.activityreference AS likesactivityreference, s1.activitytype AS likesactivitytype FROM scoop.likes \
//     INNER JOIN scoop.postcomment s1 ON scoop.likes.activityid = s1.activityid \
//     INNER JOIN scoop.users ON scoop.likes.userid = scoop.users.userid WHERE scoop.likes.activestatus = 1 AND scoop.likes.liketype=1 AND scoop.users.userid != :id) t2 ON scoop.notifications.likeid = t2.likeslikeid \
//     WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' ORDER BY scoop.notifications.modifieddate DESC',
//     {replacements:{id:userid}, type:database.QueryTypes.SELECT})
//     .then(results=>{
//         for (var i = 0; i < results.length; i++){
//             if(results[i].likesliketype != 1){
//                 delete results[i]
//             }
//         }
//         results = results.filter(o => Object.keys(o).length); 
//         console.log(results);
//         response.send(results); //sends results back after select statement
//     });
// });


/**
 * Description: used to get notifications after 24 hours
 */
router.get('/recentnotifs/:id', (request, response)=>{
    const userid = request.params.id; //gets the user id passed in
   
    database.query('SELECT notificationid, scoop.notifications.userid AS currentuser, activityid, modifieddate, likesid, likesuserid, liketype, activitytype, activityreference,\
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
        console.log("Number of notfications for this user: " + results.length)
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
router.get("/recentimages/:id", authorization, (request, response) => {
  const userid = request.params.id; //gets the user id passed in
    database.query('SELECT notificationid, scoop.notifications.userid AS currentuser, activityid, modifieddate, likesid, likesuserid, activitytype, activityreference,\
    COALESCE (likesnotifier.profileimage, commentnotifier.profileimage) AS profileimage FROM scoop.notifications\
    LEFT JOIN (SELECT scoop.likes.likeid AS likesid, scoop.likes.userid AS likesuserid FROM scoop.likes) likes ON likes.likesid = scoop.notifications.likeid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) likesnotifier ON likesnotifier.userid = likes.likesuserid\
    LEFT JOIN (SELECT scoop.postcomment.activitytype AS activitytype, scoop.postcomment.activityreference AS activityreference,\
      scoop.postcomment.activityid as commentsid, scoop.postcomment.userid AS commentsuserid FROM scoop.postcomment) comments ON comments.commentsid = scoop.notifications.activityid\
      LEFT JOIN(SELECT scoop.users.userid AS userid, scoop.users.profileimage AS profileimage FROM scoop.users) commentnotifier ON commentnotifier.userid = comments.commentsuserid\
    WHERE scoop.notifications.userid = :id AND scoop.notifications.modifieddate < NOW() - INTERVAL \'24 HOURS\' AND scoop.notifications.activestatus = 1\
    ORDER BY scoop.notifications.modifieddate DESC',
    {replacements:{id:userid}, type:database.QueryTypes.SELECT})
    .then(results=>{
      results = results.filter(o => Object.keys(o).length); 
        for(i=0; i< results.length; i++){
            if(results[i].profileimage != null){ //checks if activity profile image is not null
                var imagePath = results[i].profileimage; //gets the image path of the activity profile image
                var imageFile = fs.readFileSync(imagePath) //reads the image path and stores the file into a variable
                var base64data = imageFile.toString('base64') //converts the image file to a string
                results[i].profileimage = base64data; //saves it into the results activity profile image
            // }else if(results[i].likesprofileimage != null){ //checks if likes profile image is not null
            //     var imagePath = results[i].likesprofileimage; //gets the image path of the likes profile image
            //     var imageFile = fs.readFileSync(imagePath) //reads the image path and stores the file into a variable
            //     var base64data = imageFile.toString('base64')  //converts the image file to a string
            //     results[i].likesprofileimage = base64data; //saves it in the results likes profile image
            }else{ //otherwise all the images are null
                console.log("images are all null") //logs accordingly 
            }
        }
        response.send(results); //sends results back after for loop
      }
    )
});


// if(results[i].postimagepath != null && results[i].postimagepath != ""){ //if there is a post image
//   console.log("There is a post image!")
//   var postImagePath = results[i].postimagepath; //gets the image path of the postimagepath
//   var postImageFile = fs.readFileSync(postImagePath); //reads the image path and stores the file into a variable
//   var postbase64data = postImageFile.toString('base64'); //converts the image file to a string
//   results[i].postimagepath = postbase64data; //saves it into the results postimagepath

//   var userImagePath = results[i].profileimage;
//   var userImageFile = fs.readFileSync(userImagePath);
//   var userbase64data = userImageFile.toString('base64');
//   results[i].profileimage = userbase64data;
// }else{
//   var userImagePath = results[i].profileimage;
//   var userImageFile = fs.readFileSync(userImagePath);
//   var userbase64data = userImageFile.toString('base64');
//   results[i].profileimage = userbase64data;

// Description of SELECT statement: Selects images after 24 hours which is left joined on activity ids with a table made of the activities joined with the person who performed the activity \
//                                  which is then left joined on like ids with a table made of likes joined with activities they liked joined with the users who performed the like

module.exports = router;
