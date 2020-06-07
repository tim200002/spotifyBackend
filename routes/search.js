//Important for Environmet Variables -> when not in Production load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const _= require('lodash');
var NewSpotifyApi=require('../Classes/newSpotifyApi')
var express = require('express');
var router = express.Router();
const { User } = require('../models/user');
const {Party}= require('../models/party')

var newSpotifyApi= new NewSpotifyApi(
    process.env.client_Id,
    process.env.client_secret_key,
    process.env.redirect_uri
)

router.post('/', async(req,res)=>{
    try{
        console.log(req.body)
        var party = await Party.findById(req.body.partyId)
        var user=await User.findById(party.user);
        var accessToken=await user.isAccessValid();
        var search = await newSpotifyApi.search(accessToken, req.body.query);
        //Format Result
        var tracks=search.tracks.items;
        var result=[]
        tracks.forEach((item)=>{result.push({
            artist: item.artists[0].name,
            songId: item.id,
            title: item.name,
            albumArt:item.album.images[2].url //Not Sure index 1 or 2 1 is bigger
        })})
        res.send(result);
        }
        catch (err){
            console.log(err.message);
            res.status(400).send("Error Finding title")
        }
});

module.exports=router;