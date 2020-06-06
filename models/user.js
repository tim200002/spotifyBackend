const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const NewSpotifyApi=require('../Classes/newSpotifyApi')

//Important for Environmet Variables -> when not in Producation load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

var newSpotifyApi= new NewSpotifyApi(
    process.env.client_Id,
    process.env.client_secret_key,
    process.env.redirect_uri
)
const ObjectId=mongoose.Schema.Types.ObjectId
const userSchema = new mongoose.Schema({
    //Token when first connected to API after that not used anymore
    authToken: {
        type: String
    },
    //Token is valid for one hour to acces API
    accessToken: {
        type: String
    },
    //When accesToken invalid one can get new acces Token via the refresh Token
    refreshToken: {
        type: String
    },
    //Time when last Acces Token got made -> invalid after one hour (time.now-accesTokenTime)/1000>3600
    issueTime: {
        type: Number
    },
    //List of All Parties User was part of and if he is the Admin
    parties: {
        type:[{
            id:{
                type: ObjectId,
                ref: "Party"
            },
            isAdmin: Boolean
        }]
    }

});

//Checks if Acces Token is Valid if not Refreshess
userSchema.methods.isAccessValid = function () {
    return new Promise(async (resolve, reject) => {
        //New Token needed
        if ((Date.now() - this.issueTime) / 1000 > 3600) {
            console.log("new");
            const ret=await newSpotifyApi.refreshAccesToken(this.refreshToken);
            this.accessToken=ret.acces_token;
            this.issueTime=Date.now();
            this.save();
            resolve(this.accessToken);
        }
        else{
        console.log("still valid");
        resolve(this.accessToken); 
        }  
    });

}

const User = mongoose.model('User', userSchema);


exports.User = User;