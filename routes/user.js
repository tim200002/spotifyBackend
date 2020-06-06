const _= require('lodash');
const { User } = require('../models/user');
var express = require('express');
var router=express.Router();
const bcrypt=require('bcryptjs')


//Creates a new User 
router.post('/createNewUser', async (req, res) => {
    console.log("Request")
    let user = new User();
    user = await user.save();
    res.send({id: user._id});

});

//Validate User
router.get('/validate', async (req,res)=>{
    console.log(req.query)
    let user = await User.findById(req.query._id)
    if (user){
        res.send(user._id)
    }
    else {
        res.status(400).send("Error User not found")
    }
}
)


module.exports=router;