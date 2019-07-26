const express = require('express')
const database = require('../config/database')
const router = express.Router()
const fs = require('fs')
const userModel = database.import('../models/users')
const userSocialModel = database.import('../models/usersocial')
const positionModel = database.import('../models/positions')
const divisionModel = database.import('../models/divisions')
const buildingModel = database.import('../models/buildings')
const authorization = require("../config/token-verification");

// From the user id, this function grabs ands sends the user's info displayed
// on the user profile
router.get("/initialfill/:userid", authorization, (request, response) => {
    // Getting the user's profile.
    var userid = request.params.userid
    
    // Necessary variables
    var imagePath, imageFile, base64data, fullName, positionid, divisionid, buildingid, city, province, object;
    
    // Output arry
    var output = {}

    // Finding the user's row on the user table
    userModel.findOne({
        where: {
            userid: userid
        }
    }).then(result => {
        // Getting the image path and encoding it
        imagePath = result.profileimage
        imageFile = fs.readFileSync(imagePath)
        base64data = imageFile.toString('base64')

        // Full name
        fullName = result.firstname + " " + result.lastname
        
        // ID's for position, division, building - requires further querying
        positionid = result.positionid
        divisionid = result.divisionid
        buildingid = result.buildingid
    }).then( () => {
        // Promise to get results of query
        // Result[0] = position name
        // Resilt[1] = division name
        // Result[2] = building object
        // Result[3] = social media url array
        Promise.all([getPositionName(positionid), getDivisionName(divisionid), getBuilding(buildingid), initialSocial(userid)]).then(result => {
            // City and province
            if (result[2] !== null) {
                city = result[2].city
                province = result[2].province
            } else {
                city = null;
                province = null;
            }

            // Putting into object
            object = {fullname: fullName, profileimage: base64data, position: result[0], division: result[1], city, province}
            output = jsonConcat(object, output)
            output = jsonConcat(result[3], output)

            // sending the result back to application
            response.send(output)
        })
    })
})

router.get("/posttextfill/:userclicked/:currentuser", authorization, (request, response) => {
    var userClicked = request.params.userclicked
    var currentuser = request.params.currentuser
    database.query('SELECT coalesce(scoop.postcomment.activityid, t1.duplicateactivityid, t2.likesactivityid) AS activityid, posttitle, posttext, activestatus, createddate, activitytype, scoop.postcomment.userid, scoop.postcomment.activityreference,\
        postimagepath, likecount, liketype, commentcount, firstname, lastname, savedactivityid, saveduserid, savedstatus FROM scoop.postcomment\
    LEFT JOIN (SELECT SUM(scoop.likes.liketype) AS likecount, scoop.likes.activityid AS duplicateactivityid FROM scoop.likes GROUP BY scoop.likes.activityid) t1 ON scoop.postcomment.activityid = t1.duplicateactivityid \
    LEFT JOIN (SELECT scoop.likes.liketype, scoop.likes.activityid AS likesactivityid FROM scoop.likes WHERE scoop.likes.userid = :currentuser) t2 ON scoop.postcomment.activityid = t2.likesactivityid \
    LEFT JOIN (SELECT COUNT(*) AS commentcount, scoop.postcomment.activityreference AS activityreference FROM scoop.postcomment GROUP BY scoop.postcomment.activityreference) t3 ON scoop.postcomment.activityid = t3.activityreference \
    INNER JOIN (SELECT scoop.users.firstname AS firstname, scoop.users.lastname AS lastname, scoop.users.userid AS userid FROM scoop.users) t5 ON scoop.postcomment.userid = t5.userid \
    LEFT JOIN (SELECT scoop.savedposts.userid as saveduserid, scoop.savedposts.activityid AS savedactivityid, CASE\
        WHEN scoop.savedposts.userid = null THEN FALSE ELSE TRUE END AS savedstatus FROM scoop.savedposts WHERE scoop.savedposts.userid = :currentuser) t4 ON scoop.postcomment.activityid = t4.savedactivityid\
    WHERE scoop.postcomment.activitytype = 1 AND scoop.postcomment.activestatus = 1 AND scoop.postcomment.userid = :id\
    ORDER BY scoop.postcomment.modifieddate DESC', 
    {replacements: {id: userClicked, currentuser: currentuser}, type: database.QueryTypes.SELECT})
    .then(results => {
        console.log(results)
        response.send(results)
    })
})

router.get('/postimagefill/:userid', authorization, (request, response)=>{
    const userid = request.params.userid; 

    database.query('SELECT scoop.users.profileimage AS profileimage FROM scoop.postcomment \
    INNER JOIN scoop.users ON scoop.postcomment.userid = scoop.users.userid \
    WHERE scoop.postcomment.activitytype = 1 AND scoop.postcomment.activestatus = 1 AND scoop.postcomment.userid = :id \
    ORDER BY scoop.postcomment.modifieddate DESC',
    {replacements: {id: userid}, type: database.QueryTypes.SELECT})
    .then(results=>{
        for(i=0; i<results.length; i++){                        
            var userImagePath = results[i].profileimage;                
            var userImageFile = fs.readFileSync(userImagePath);
            var userbase64data = userImageFile.toString('base64');
            results[i].profileimage = userbase64data;
        }
        console.log(results.length)
        response.send(results);
    })
})

/**
 * Query to grab the necessary attributes for the Profile Comments
 * Current User's first and last name and comment message, Poster's first and last name and the referenceID to the post itself.
 *  
 */
router.get('/comment-message/:userclicked/:currentuser', authorization, (request, response) => {
    var userClicked = request.params.userclicked
    var currentUser = request.params.currentuser
    database.query('SELECT coalesce(A.activityid, t1.duplicateactivityid, t2.likesactivityid) AS activityid, A.posttext, A.activestatus, A.createddate, A.activitytype, A.userid, A.activityreference, likecount, liketype, firstname, lastname, postfirstname, postlastname FROM scoop.postcomment A \
    INNER JOIN (SELECT scoop.postcomment.activityid, scoop.users.firstname AS postfirstname, scoop.users.lastname AS postlastname FROM scoop.postcomment INNER JOIN scoop.users ON scoop.postcomment.userid = scoop.users.userid) B ON A.activityreference = B.activityid \
    LEFT JOIN (SELECT SUM(scoop.likes.liketype) AS likecount, scoop.likes.activityid AS duplicateactivityid FROM scoop.likes GROUP BY scoop.likes.activityid) t1 ON A.activityid = t1.duplicateactivityid \
    LEFT JOIN (SELECT scoop.likes.liketype, scoop.likes.activityid AS likesactivityid FROM scoop.likes WHERE scoop.likes.userid = :currentuser) t2 ON A.activityid = t2.likesactivityid \
    INNER JOIN (SELECT scoop.users.firstname AS firstname, scoop.users.lastname AS lastname, scoop.users.userid AS currentuserid FROM scoop.users) t4 ON A.userid = t4.currentuserid \
    WHERE A.activitytype = 2 AND A.activestatus = 1 AND A.userid = :id \
    ORDER BY A.modifieddate DESC', 
    {replacements: {id: userClicked, currentuser: currentUser}, type: database.QueryTypes.SELECT})
    .then(results => {
        console.log(results)
        response.send(results)
    })
})

/**
 * Query to grab the user's profile image for the Profile Comments
 */
router.get('/comment-profile-image/:userid', authorization, (request, response)=>{
    const userid = request.params.userid; 

    database.query('SELECT scoop.users.profileimage AS profileimage FROM scoop.postcomment \
    INNER JOIN scoop.users ON scoop.postcomment.userid = scoop.users.userid \
    WHERE scoop.postcomment.activitytype = 2 AND scoop.postcomment.activestatus = 1 AND scoop.postcomment.userid = :id \
    ORDER BY scoop.postcomment.modifieddate DESC',
    {replacements: {id: userid}, type: database.QueryTypes.SELECT})
    .then(results=>{
        for(i=0; i<results.length; i++){                        
            var userImagePath = results[i].profileimage;                
            var userImageFile = fs.readFileSync(userImagePath);
            var userbase64data = userImageFile.toString('base64');
            results[i].profileimage = userbase64data;
        }
        console.log(results.length)
        response.send(results);
    })
})

// Function to get the position name from the position id
const getPositionName = (positionid) => {
    if (positionid !== null) {
        return positionModel.findOne({
            where: {
                positionid: positionid
            }
        }).then(result => {
            return result.positionname
        })
    } else {
        return null
    }
}

// Function to get the division name from the division id
const getDivisionName = (divisionid) => {
    if (divisionid !== null) {
        return divisionModel.findOne({
            where: {
                divisionid: divisionid
            }
        }).then(result => {
            return result.division_en
        })
    } else {
        return null
    }
}

// Function to get building object from the building id
const getBuilding = (buildingid) => {
    if (buildingid !== null) {
        return buildingModel.findOne({
            where: {
                buildingid: buildingid
            }
        }).then(result => {
            return result
        })
    } else {
        return null
    }
}

router.get('/get-profile-comment/:userclicked', authorization, (req, res)=>{
    const userclicked = req.params.userclicked;
    database.query(
        'SELECT scoop.users.firstname userClickedFName, t2.postText postText, posternames.posterfname, posternames.posterlname FROM scoop.users \
        INNER JOIN scoop.postcomment t2 ON scoop.users.userid = t2.userid \
        left join ( select scoop.users.userid, scoop.users.firstname posterfname, scoop.users.lastname posterlname from scoop.users) posternames \
        left join scoop.postcomment t3 ON t3.userid = posternames.userid  \
        on t2.activityreference = t3.activityid \
        WHERE scoop.users.userid = :id and t2.activitytype = 2',
        {replacements:{id: userclicked}, type: database.QueryTypes.SELECT}
    ).then (result=>{
        console.log(result)
        response.send(result)  
    })
})


// Function to get all the urls of the user
const initialSocial = (userid) => {
    // query to find the users social
    return userSocialModel.findAll({
        where: {
            userid: userid,
            activestatus: 1
        }
    }).then(result => {
        // Putting all the social media urls into the an array 
        var object = {facebook: null, instagram: null, linkedin: null, twitter: null}

        // For loop to go through all the users social medias
        for (var i = 0; i < result.length; i++) {
            var current = result[i]

            // Switch to assign the correct urls to the correct social media
            if (current.socialmediaid === 1) {
                object.facebook = current.url
            } else if (current.socialmediaid === 2) {
                object.instagram = current.url
            } else if (current.socialmediaid === 3) {
                object.linkedin = current.url
            } if (current.socialmediaid === 4) {
                object.twitter = current.url       
            }
        }
        // Returns object to the initial fill
        return object
    })
}

// helper function to concatenate two objects
function jsonConcat(o1, o2) {
    for (var key in o2) {
        o1[key] = o2[key];
    }
    return o1;
}


/** gets all post a user has liked
 *  userclicked: the user whom you wish to get all posts they have liked 
 *  currentuser: the user who is currently logged in. You need this because the app shows wether the logged in user has liked the post or not
 */
router.get("/getlikes/text/:userclicked/:currentuser", authorization, (request, response) => {
    var userClicked = request.params.userclicked
    var currentuser = request.params.currentuser
    database.query('SELECT coalesce(B.activityid, t1.duplicateactivityid, t2.likesactivityid) AS activityid, posttitle, posttext, B.activestatus, B.createddate, activitytype,\
        B.userid, B.activityreference, postimagepath, likecount, A.liketype, commentcount, firstname, lastname, savedactivityid, saveduserid, savedstatus FROM scoop.likes A, scoop.postcomment B \
    LEFT JOIN (SELECT SUM(scoop.likes.liketype) AS likecount, scoop.likes.activityid AS duplicateactivityid FROM scoop.likes GROUP BY scoop.likes.activityid) t1 ON B.activityid = t1.duplicateactivityid \
    LEFT JOIN (SELECT scoop.likes.liketype, scoop.likes.activityid AS likesactivityid FROM scoop.likes WHERE scoop.likes.userid = :currentuser) t2 ON B.activityid = t2.likesactivityid \
    LEFT JOIN (SELECT COUNT(*) AS commentcount, scoop.postcomment.activityreference AS activityreference FROM scoop.postcomment GROUP BY activityreference) t3 ON B.activityid = t3.activityreference \
    INNER JOIN (SELECT scoop.users.firstname AS firstname, scoop.users.lastname AS lastname, scoop.users.userid AS userid FROM scoop.users) t5 ON B.userid = t5.userid \
    LEFT JOIN (SELECT scoop.savedposts.userid as saveduserid, scoop.savedposts.activityid AS savedactivityid, CASE\
        WHEN scoop.savedposts.userid = null THEN FALSE ELSE TRUE END AS savedstatus FROM scoop.savedposts WHERE scoop.savedposts.userid = :currentuser) t4 ON B.activityid = t4.savedactivityid\
    WHERE  A.activestatus = 1 AND B.activitytype = 1 AND B.activestatus = 1 AND B.activityid = A.activityid AND A.userid = :id AND A.liketype = 1\
    ORDER BY B.modifieddate DESC', 
    {replacements: {id: userClicked, currentuser: currentuser}, type: database.QueryTypes.SELECT})
    .then(results => {
        console.log(results)
        response.send(results)
    })

})


router.get('/getlikes/images/:userid', authorization, (request, response)=>{
    const userid = request.params.userid; 

    database.query('SELECT scoop.users.profileimage AS profileimage FROM scoop.postcomment \
    INNER JOIN scoop.users ON scoop.postcomment.userid = scoop.users.userid \
    INNER JOIN scoop.likes ON scoop.postcomment.activityid = scoop.likes.activityid \
    WHERE scoop.postcomment.activitytype = 1 AND scoop.postcomment.activestatus = 1 AND scoop.likes.userid = :id AND scoop.likes.liketype = 1\
    ORDER BY scoop.postcomment.modifieddate DESC',
    {replacements: {id: userid}, type: database.QueryTypes.SELECT})
    .then(results=>{
        for(i=0; i<results.length; i++){                        
            var userImagePath = results[i].profileimage;                
            var userImageFile = fs.readFileSync(userImagePath);
            var userbase64data = userImageFile.toString('base64');
            results[i].profileimage = userbase64data;
        }
        console.log(results.length)
        response.send(results);
    })
})


/**
 * - Function to get list of addresses for all buildings in the database
 * - Used in the app's search building activity
 */
router.get("/getallbuildings", authorization, (request, response) => {
   
    database.query('SELECT concat(address, \', \', city, \', \', province) as building, scoop.buildings.buildingid FROM scoop.buildings ORDER BY province', 
    {replacements: {}, type: database.QueryTypes.SELECT})
    .then(results => {
        console.log(results)
        response.send(results)
    })

})


/**
 *  Description: get text and user image of all profiles matching a search query
 * 
 */
router.get('/search/:query', authorization, (request, response)=>{

    function splitQueryString(t) {
        console.log(t)
        console.log(typeof(t))
        return t.split(" | ");
    }
    
    function getSearchMatchQuery(array) {
        var result = ''
        for (var i = 0; i < array.length; i++) {
            if (i>0) {
                result += 'OR '
            }
            result += 'CONCAT(A.firstname, A.lastname, B.positionname, C.division_en, C.division_fr, \
                D.buildingname_en, D.buildingname_fr, D.address, D.city, D.province) ILIKE \'%'+array[i]+'%\' '
        }
        return result
    }
    
    var names = splitQueryString(request.params.query)
    console.log(names)
    console.log(typeof(names))

    var matchQuery = getSearchMatchQuery(names)
  
    database.query(' \
    SELECT A.userid, A.firstname, A.lastname, B.positionname, C.division_en, C.division_fr, \
    D.buildingname_en, D.buildingname_fr, D.address, D.city, D.province, E.profileimage \
    FROM scoop.users AS A \
    LEFT JOIN scoop.positions AS B ON B.positionid = A.positionid \
    LEFT JOIN scoop.divisions AS C ON C.divisionid = A.divisionid \
    LEFT JOIN scoop.buildings AS D ON D.buildingid = A.buildingid \
    LEFT JOIN scoop.users AS E ON E.userid = A.userid \
    WHERE A.userstatus = 1 \
    AND (' + matchQuery + 
    ')',
    {replacements: {}, type: database.QueryTypes.SELECT})
    .then(results=>{
        for(i=0; i<results.length; i++){                        
            var userImagePath = results[i].profileimage;                
            var userImageFile = fs.readFileSync(userImagePath);
            var userbase64data = userImageFile.toString('base64');
            results[i].profileimage = userbase64data;
        }
        console.log(results.length)
        response.send(results);
    })
  })

module.exports = router