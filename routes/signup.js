const express = require("express");
const database = require("../config/database");
const userModel = database.import("../models/users");
const userSettingsModel = database.import("../models/usersettings");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const router = express.Router();

// reading the private key that is going to be used to as the secret key for tokens
var path = "../scoop-middle-tier/private.key";
var privatekey = fs.readFileSync(path, "utf8");

var genRandomString = function(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex") // converts to hex format
    .slice(0, length);
};

var sha512 = function(password, salt) {
  var hash = crypto.createHmac("sha512", salt); //passes in the type of sha2 and the randomly generated salt
  hash.update(password); //updates the hash with the password
  var value = hash.digest("hex"); //computes the hash and stores it in variable value
  return {
    //returns an object with salt and passwordHash
    salt: salt,
    passwordHash: value
  };
};

function saltHashPassword(userPassword) {
  var salt = genRandomString(16); //creates 16 random characters
  var passwordData = sha512(userPassword, salt); //gets passwordData from the sha512 function
  return passwordData;
}

function checkHashPassword(userPassword, salt) {
  var passwordData = sha512(userPassword, salt); //gets passwordData from sha 512 function
  return passwordData;
}

router.post("/register", (request, response) => {
  const { firstname, lastname, email, password } = request.body;
  var defaultImagePath = "./pictures/profilepictures/default.jpg";
  var useridVar;

  // Encrypting the password
  passwordData = saltHashPassword(password);
  var str = email;
  var pattern = /^([a-zA-Z]*)+\.+([a-zA-Z]*)+([0-9]?)+@canada\.ca$/g

  // checking if email exists
  database.query("SELECT users.email FROM scoop.users WHERE email = :email",
  { replacements: {email: email}, type: database.QueryTypes.SELECT })
  .then(results=>{
    console.log(results);
    if (results.length == 0) {
      if (str.match(pattern)){ 
        // Inserting the data into the database
        userModel
        .create({
          firstname: firstname,
          lastname: lastname,
          email: email,
          salt: passwordData.salt,
          passwordhash: passwordData.passwordHash,
          profileimage: defaultImagePath,
          userstatus: 1
        })
        .then(() => {
          userModel
          .findAll({
            attributes: ["userid"],
            where: {
              email: email
            }
          })
          .then(results => {
            const userid = results[0].userid; // grabbing the user id
            database.query("INSERT INTO scoop.usersettings(userid)VALUES (:userid)", // added settings entry in database for the user 
            { replacements:{ userid: userid}, type: database.QueryTypes.INSERT})
            .then(
            // validing a token for the successfully signed up user
            // token payload contains the user id
              jwt.sign({ userid: userid }, privatekey, (err, token) => {
                if (err) {
                  console.log(err);
                }
                console.log(userid); // user id
                console.log(token); // token that was created
                response.send(token); // send the token as the server response to a successful register
              })  
            );
          });
        });

      } else {
        response.send("ERROR_EMAIL_FORMAT");
      }       
    } else {
      response.send("ERROR_EMAIL_EXISTS");
    }
  });   
});

router.post("/login", (request, response) => {
  const { email, password } = request.body;

  // finds the email if exist in the user table
  userModel
    .findAll({
      attributes: ["userid", "passwordhash", "salt"],
      where: {
        email: email
      }
    })
    .then(result => {
      salt = result[0].salt; //gets the salt from the result
      pw = result[0].passwordhash; //gets the password from the result
      userid = result[0].userid; //gets the user id from the result
      passwordData = checkHashPassword(password, salt);
      if (pw == passwordData.passwordHash) {
        //if password hash in database matches what was entered
        // on successful log in
        console.log(userid.toString());

        // signing a jwt token for the user that has successfully logged in
        // storing their user id in the token payload
        jwt.sign({ userid: userid }, privatekey, (err, token) => {
          if (err) {
            console.log(err);
          }
          console.log(token);
          response.json(token); // server sends the token containing the user id as a response
        });
      } else {
        response.send("Incorrect Password");
      }
    })
    .catch(function(err) {
      //if there is no such email
      if (err) {
        console.log(err);
        response.send("Invalid Email"); // sends back invalid email
      }
    });
});

module.exports = router;
