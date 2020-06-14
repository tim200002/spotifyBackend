const _= require('lodash');
const { User } = require('../models/user');
var express = require('express');
var router=express.Router();



//Create a new User 
router.post('/createNewUser', async (req, res) => {
    //Normaly there is no Reason why this shoud fail -> Try could be unneceessary
    try{
    let user = new User();
    user = await user.save();
    res.send({id: user._id});
    }
    catch(err){
        console.log("Error in Endpoint post createNewUser")
        console.log(err.message)
        res.status(400).send(err.message)
    }

});

//Validate if user exitsy by Id
router.get('/validate', async (req,res)=>{
    try{
    let user = await User.findById(req.query._id)
    if (user){
        res.send(user._id)
    }
    else {
        res.status(400).send("Error User not found")
    }
}
catch(err){
    console.log("Error in Endpoint get validate")
    console.log(err.message)
    res.status(400).send(err.message)
}
}
)


module.exports=router;