const database = require("../config/database");
const express = require("express");
const postCommentModel = database.import("../models/postcomment");
const notifModel = database.import("../models/notifications")
const authorization = require("../config/token-verification");

const router = express.Router();

router.post("/", authorization, (req, res) => {
  const { userid, activitytype, posttext, activityreference, posterid} = req.body;
  console.log(userid);
  console.log(activityreference);
  
  postCommentModel
    .create({
      userid: userid,
      activitytype: activitytype,
      posttext: posttext,
      activityreference: activityreference
    })
    .then((result) => {
      console.log(result.activityid)
      notifModel.create({
        userid: posterid, 
        activityid: result.activityreference,
        activestatus: 1,
      })
      res.send("Success");
    });
});

module.exports = router;
