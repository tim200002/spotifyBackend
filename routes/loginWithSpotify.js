//The Routes to validate at the Spotify Webn Page

//Important for Environmet Variables -> when not in Production load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
var NewSpotifyApi=require('../Classes/newSpotifyApi')
var express = require('express');
var router = express.Router();
const { User } = require('../models/user');


var newSpotifyApi= new NewSpotifyApi(
    process.env.client_Id,
    process.env.client_secret_key,
    process.env.redirect_uri
)

const scopes = 'user-modify-playback-state user-read-playback-state user-read-currently-playing app-remote-control';

//Login User id mus be in body
router.get('/LoginSpotify',async (req,res)=>{
    try{
    var user = await User.findById(req.query._id)
    console.log(user)
    if(!user) return res.status(401).send("User not valid")
    }
    catch(err){
        return res.status(401).send(err.message)
    }
    res.send({url: 'https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' + process.env.client_Id +
        (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
        '&redirect_uri=' + encodeURIComponent(process.env.redirect_uri)+
        '&state='+req.query._id});
})

//Route which is called after succesfull validation
router.get('/callback', async (req, res) => {
    try{
    const  authToken  = req.query.code;
    const state =req.query.state;
    const codes=await newSpotifyApi.getAccesToken(authToken);
    const user=await User.findById(state);
    const helper={
        authToken: state,
        accessToken: codes.acces_token,
        refreshToken: codes.refresh_token,
        issueTime: codes.issue_time

    }
    var temp=await user.update(helper);  
    console.log(codes);
    res.send("Go Back to the App");
    }
    catch(err){
        res.status(400).send(err.message)
    }
})

//Check if user is already validated at spotfiy
router.get('/Spotify/isConnected',async (req,res)=>{

    try{
    var user = await User.findById(req.query._id)

    if(!user) return res.status(400).send("User not Foundd")

    if(user.refreshToken) return res.send({isConnected: true})

    return res.send({isConnected: false})
    }
    catch(err){
        res.send(err.message)
    }
})

module.exports = router