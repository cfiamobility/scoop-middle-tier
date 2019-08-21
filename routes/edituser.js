const express = require("express");
const database = require("../config/database");
const sequelize = require("sequelize");
const userModel = database.import("../models/users");
const positionModel = database.import("../models/positions");
const divisionModel = database.import("../models/divisions");
const buildingModel = database.import("../models/buildings");
const userSocialModel = database.import("../models/usersocial");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const authorization = require("../config/token-verification");
const router = express.Router();

// Route for getting the intitial information when the user edits the profile
router.get("/get-initial/:userid", authorization, (request, response) => {
  // Gets the user id from app
  const userid = request.params.userid;

  // Query that gets all the information needed
  database
    .query(
      "SELECT *, concat(address, \', \', city, \', \', province) as address FROM scoop.users LEFT JOIN scoop.positions ON scoop.users.positionid = scoop.positions.positionid LEFT JOIN scoop.divisions ON scoop.users.divisionid = scoop.divisions.divisionid LEFT JOIN scoop.buildings ON scoop.users.buildingid = scoop.buildings.buildingid WHERE userid = :id",
      { replacements: { id: userid }, type: database.QueryTypes.SELECT }
    )
    .then(result => {
      // Gets the image path on the server, reads the file and encodes it to send back to app
      var imagePath = result[0].profileimage;
      var imageFile = fs.readFileSync(imagePath);
      var base64data = imageFile.toString("base64");
      result[0].profileimage = base64data;

      // Output array to concatenate json arrays
      var output = {};

      // Promise to get the social media info
      Promise.all([initialSocial(userid)]).then(socials => {
        // Concatenates the json array
        output = jsonConcat(output, result[0]);
        output = jsonConcat(output, socials[0]);

        // Sends the information back to the app
        response.send(output);
        console.log("noSocial");
        console.log(output);
      });
    });
});

// Route for the position auto complete text view
router.get("/positionchanged/:position", authorization, (request, response) => {
  // gets the position text in the edit text
  const position = request.params.position;

  // Query to get all the information needed
  database
    .query(
      "SELECT * FROM scoop.positions WHERE positionname LIKE '" +
        position +
        "%' LIMIT 3",
      { replacements: { position: position }, type: database.QueryTypes.SELECT }
    )
    .then(result => {
      // Sends the info back to the app
      response.send(result);
    });
});

// Route for the building auto complete text view
router.get("/addresschanged/:building", authorization, (request, response) => {
  // gets the address text from the building edit text
  const address = request.params.building;

  // Query to get all the information needed
  database
    .query(
      "SELECT * FROM scoop.buildings WHERE address LIKE '" +
        address +
        "%' LIMIT 3",
      { replacements: { address: address }, type: database.QueryTypes.SELECT }
    )
    .then(result => {
      // Sends the info back to the app
      response.send(result);
    });
});

// Route to get the division auto complete text view
router.get("/divisionchanged/:division", authorization, (request, response) => {
  // gets the division text from the division edit text
  const division = request.params.division;

  // Query to get all the information needed
  database
    .query(
      "SELECT * FROM scoop.divisions WHERE division_en LIKE '" +
        division +
        "%' LIMIT 3",
      { type: database.QueryTypes.SELECT }
    )
    .then(result => {
      // Sends the info back to app
      response.send(result);
    });
});

// Route that runs when the save button is pressed.
// Updates db with all changed information
router.put("/updatedatabase", authorization, (request, response) => {
  // Gets the data from all the edit texts from the app
  var {
    userid,
    firstname,
    lastname,
    position,
    division,
    buildingid,
    linkedin,
    twitter,
    facebook,
    instagram,
    image
  } = request.body;

  // app sends -1 for buildingid if value is null
  if (buildingid == '-1'){
    buildingid = null;
  }

  // variables for the ids
  //var positionid, buildingid, divisionid;
  var positionid, divisionid;

  // buffer for the encoded image that is passed
  let buff = new Buffer(image, "base64");

  // the image path for the photo inputted
  var newImagePath = "./pictures/profilepictures/" + userid + ".jpeg";

  // Creating the image file from the encoded string
  fs.writeFileSync(newImagePath, buff, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });

  // Promise for getting all the ids before updating the user object
  Promise.all([
    positionReturned(position),
    divisionReturned(division)
  ]).then(results => {
    // Assigning the ids to the variables
    positionid = results[0];
    divisionid = results[1];

    // Putting all the data that is to be updated into one variable
    const updatedUserData = {
      firstname: firstname,
      lastname: lastname,
      positionid: positionid,
      divisionid: divisionid,
      buildingid: buildingid,
      profileimage: newImagePath,
      modifiedby: userid,
      modifieddate: sequelize.fn("NOW")
    };

    // Updating the user table with all the information provided
    userModel.update(updatedUserData, { where: { userid: userid} });
  });

  // Promise for inputting all the user's social medias into the user social table
  Promise.all([
    facebookReturned(userid, facebook),
    twitterReturned(userid, twitter),
    linkedinReturned(userid, linkedin),
    instagramReturned(userid, instagram)
  ]);

  response.send("Success")
});

// Concatenate the json array on initial fill
function jsonConcat(o1, o2) {
  for (var key in o2) {
    o1[key] = o2[key];
  }
  return o1;
}

// Function to get all the user's social media info on initial fill
const initialSocial = userid => {
  // query to find the users social
  return userSocialModel
    .findAll({
      where: {
        userid: userid,
        activestatus: 1
      }
    })
    .then(result => {
      // Putting all the social media urls into the an array
      var object = {
        facebook: null,
        instagram: null,
        linkedin: null,
        twitter: null
      };

      // For loop to go through all the users social medias
      for (var i = 0; i < result.length; i++) {
        var current = result[i];

        // Switch to assign the correct urls to the correct social media
        if (current.socialmediaid === 1) {
          object.facebook = current.url;
        } else if (current.socialmediaid === 2) {
          object.instagram = current.url;
        } else if (current.socialmediaid === 3) {
          object.linkedin = current.url;
        }
        if (current.socialmediaid === 4) {
          object.twitter = current.url;
        }
      }
      // Returns object to the initial fill
      return object;
    });
};

// Function to update the facebook status on the usersocial table
const facebookReturned = (userid, facebook) => {
  // Finding the users social media (facebook)
  return userSocialModel
    .findOne({
      where: {
        userid: userid,
        socialmediaid: 1
      }
    })
    .then(function(found) {
      // Changing the facebook url
      if (found && facebook !== "") {
        userSocialModel.update(
          { url: facebook, activestatus: 1 },
          { where: { userid: userid, socialmediaid: 1 } }
        );
      }
      // deleting the facebook url
      else if (found && facebook === "") {
        userSocialModel.update(
          { activestatus: 0 },
          { where: { userid: userid, socialmediaid: 1 } }
        );
      }
      // inputting a new url
      else if (!found && facebook !== "") {
        userSocialModel.create({
          socialmediaid: 1,
          userid: userid,
          url: facebook,
          activestatus: 1
        });
      }
    });
};

// Function to update the instagram status on the usersocial table
const instagramReturned = (userid, instagram) => {
  return userSocialModel
    .findOne({
      where: {
        userid: userid,
        socialmediaid: 2
      }
    })
    .then(function(found) {
      if (found && instagram !== "") {
        userSocialModel.update(
          { url: instagram, activestatus: 1 },
          { where: { userid: userid, socialmediaid: 2 } }
        );
      } else if (found && instagram === "") {
        userSocialModel.update(
          { activestatus: 0 },
          { where: { userid: userid, socialmediaid: 2 } }
        );
      } else if (!found && instagram !== "") {
        userSocialModel.create({
          socialmediaid: 2,
          userid: userid,
          url: instagram,
          activestatus: 1
        });
      }
    });
};

// Function to update the twitter status on the usersocial table
const twitterReturned = (userid, twitter) => {
  // Finding the users social media (twitter)
  return userSocialModel
    .findOne({
      where: {
        userid: userid,
        socialmediaid: 4
      }
    })
    .then(function(found) {
      // Changing the twitter url
      if (found && twitter !== "") {
        userSocialModel.update(
          { url: twitter, activestatus: 1 },
          { where: { userid: userid, socialmediaid: 4 } }
        );
      }
      // Deleting the twitter url
      else if (found && twitter === "") {
        userSocialModel.update(
          { activestatus: 0 },
          { where: { userid: userid, socialmediaid: 4 } }
        );
      }
      // Inputting a new url
      else if (!found && twitter !== "") {
        userSocialModel.create({
          socialmediaid: 4,
          userid: userid,
          url: twitter,
          activestatus: 1
        });
      }
    });
};

// Function to update the linkedin status on the usersocial table
const linkedinReturned = (userid, linkedin) => {
  // Finding the user social media (linkedin)
  return userSocialModel
    .findOne({
      where: {
        userid: userid,
        socialmediaid: 3
      }
    })
    .then(function(found) {
      // Changing the linked in url
      if (found && linkedin !== "") {
        userSocialModel.update(
          { url: linkedin, activestatus: 1 },
          { where: { userid: userid, socialmediaid: 3 } }
        );
      }
      // Deleting the url
      else if (found && linkedin === "") {
        userSocialModel.update(
          { activestatus: 0 },
          { where: { userid: userid, socialmediaid: 3 } }
        );
      }
      // Inputting a new url
      else if (!found && linkedin !== "") {
        userSocialModel.create({
          socialmediaid: 3,
          userid: userid,
          url: linkedin,
          activestatus: 1
        });
      }
    });
};

// Function to get the position id from the position name inputted at edittext
const positionReturned = position => {
  let positionid;
  if (position !== "") {
    return positionModel.findOrCreate({
        // Finding the position in the position table
        where: {
          positionname: position
        },
        // If not found, it will create a tuple in the database
        defaults: {
          positionname: position
        }
      })
      .then(results => {
        // Grabbing the id of the position
        return results[0].positionid
      });
  } else {
    positionid = null;
    return positionid;
  }
};


// Function to get the building id from the address inputted at edittext
const buildingReturned = (building, city, province) => {
  let buildingid;
  if (building !== "") {
    return buildingModel
      .findOrCreate({
        // Finding the address in the buildings table
        where: {
          address: building
        },
        // If not found, it will create a tuple in the database
        defaults: {
          address: building,
          city: city,
          province: province
        }
      })
      .then(results => {
        //Grabbing id of the building
        return results[0].buildingid
      });
  } else {
    buildingid = null;
    return buildingid;
  }
};

// Function to get the division id from the division inputted at edittext
const divisionReturned = division => {
  let divisionid;
  if (division !== "") {
    return divisionModel.findOrCreate({
        // Finding the division in the division table
        where: {
          division_en: division
        },
        // Finding the division in the division table
        defaults: {
          division_en: division
        }
      })
      .then(results => {
        // Grabbing the id of the division
        return results[0].divisionid
      });
  } else {
    divisionid = null;
    return divisionid;
  }
};

module.exports = router;
