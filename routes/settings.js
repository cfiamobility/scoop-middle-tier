const fs = require("fs"); //instantiate file system
const express = require("express"); //instantiate express
const database = require("../config/database"); //import database
const authorization = require("../config/token-verification"); // importing token authorization function
const router = express.Router(); //create a router

/**
 * The /settings/ route is used by the settings activity in the android app
 */

// Recives updated setting values from the app and applies them to the database
router.post("/updateSettings", (request, response) => {
    var {
        userid,
    } = request.body;

    database.query("select COLUMN_NAME from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME='usersettings'", // fetch list of names of columns in the usersetting's table
    {type: database.QueryTypes.SELECT})
    .then(results=>{
        var allowedSettings = results;
        for(var key in request.body) {
            if(request.body.hasOwnProperty(key) && isValidSetting(key, allowedSettings)){ // must check if setting is valid to protect against SQL Injection attack due to using raw value in the next database query 
                if (key != "userid"){
                    database.query("UPDATE scoop.usersettings SET " + key + " = :value WHERE userid = :userid",
                    { replacements:{ userid: userid, value: request.body[key]}, type: database.QueryTypes.UPDATE  })
                }
            }
        }
        response.send("Success");
    })


});

// returns all setting values for a specific user
router.post("/getUserSettings", (request, response) => {
    var {
        userid
    } = request.body;
    

    database.query("SELECT * FROM scoop.usersettings WHERE userid = :userid", 
    {replacements: {userid: userid}, type: database.QueryTypes.SELECT})
    .then(results=>{
      response.send(results);
    })

});

// used by /updateSettings to verfiy a setting
function isValidSetting(settingToValidate, allowedSettings) {
    for (var setting in allowedSettings){
        for (let [key, value] of Object.entries(allowedSettings[setting])) {
            if (settingToValidate == value){
                return true;
            }
        }
    }
    return false;
}


module.exports = router;