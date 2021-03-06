if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

var express = require('express');
var router = express.Router();
const { Party } = require('../models/party')
const { User } = require('../models/user')



//Validate if party belonging to the ID exists
router.get("/validate", async (req,res)=>{
    try {
        var party = await Party.findById(req.query.partyId)
        if (!party) return res.status(400).send("Couldnt find Party")
        res.send(party)
    }
    catch (err) {
        console.log("Error in Endpoint get validate (Web SDK)")
        console.log(err.message)
        res.status(400).send(err.message)
    }
})

module.exports = router