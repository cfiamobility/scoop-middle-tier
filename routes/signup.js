const express = require("express");
const database = require("../config/database");
const userModel = database.import("../models/users");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const router = express.Router();

var genRandomString = function(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex") // converts to hex format
    .slice(0, length);
};

var sha512 = function(password, salt) {
  var hash = crypto.createHmac("sha512", salt);
  hash.update(password);
  var value = hash.digest("hex");
  return {
    salt: salt,
    passwordHash: value
  };
};

function saltHashPassword(userPassword) {
  var salt = genRandomString(16); //creates 16 random characters
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

function checkHashPassword(userPassword, salt) {
  var passwordData = sha512(userPassword, salt);
  return passwordData;
}

router.post("/register", (request, response) => {
  const { firstname, lastname, email, password } = request.body;

  // Encrypting the password
  passwordData = saltHashPassword(password);

  // Inserting the data into the database
  userModel
    .create({
      firstname: firstname,
      lastname: lastname,
      email: email,
      salt: passwordData.salt,
      passwordhash: passwordData.passwordHash
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
          const userid = results[0].userid;
          console.log(request.sessionID);
          response.send(`Success ${userid.toString()}`);
        });
    });
});

router.post("/login", (request, response) => {
  const { email, password } = request.body;
  userModel
    .findAll({
      attributes: ["userid", "passwordhash", "salt"],
      where: {
        email: email
      }
    })
    .then(result => {
      salt = result[0].salt;
      pw = result[0].passwordhash;
      userid = result[0].userid;
      passwordData = checkHashPassword(password, salt);
      if (pw == passwordData.passwordHash) {
        // on successful log in
        console.log(userid.toString());

        // TODO: TESTING JWT TOKENS
        // sending user information in the token payload
        // jwt.sign({ payload }, secret key (can be any string), callback function)
        // token contains all the information we need to make a request
        jwt.sign({userid: userid.toString()}, 'secretkey', (err, token) => {
          console.log(token);
          response.json(token);
        });

        // response.send(`Success ${userid.toString()}`);
      } else {
        response.send("Incorrect Password");
      }
    })
    .catch(function(err) {
      if (err) {
        console.log(err);
        response.send("Invalid Email");
      }
    });
});

// need to verify the user on every single request to make sure that it is an authorized connection
router.post("/logout", (request, response) => {
  const token = request.headers['authorization'].split(" ")[1]; // grabbing the token from the request header
  const finaltoken = token.match(/(?:"[^"]*"|^[^"]*$)/)[0].replace(/"/g, ""); // to remove the double quotations from the token

  // verifying the token that was grabbed from the request header
  jwt.verify(finaltoken, 'secretkey', (err, authData) => {
    if (err) {
      // token is wrong
      console.log("Error");
    } else {
      // token is verified
      console.log(authData.userid);
    }
  })
})

module.exports = router;
