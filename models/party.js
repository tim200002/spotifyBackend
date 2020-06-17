const mongoose = require('mongoose');

//Important for Environmet Variables -> when not in Producation load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const ObjectId=mongoose.Schema.Types.ObjectId
const PartyScheme =new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    //Party Id not used yet maybe later
    partyId:{
        type: String
    },
    playlist:{
        type: [{
            id: String,
            artist: String,
            title: String,
            albumArt: String,
            votes: Number,
            voters: [{
                type: ObjectId,
                ref:"User"
            }],
        }]
    },
    user:{
        type: ObjectId,
        ref: "User"
    },
    socketId: String,
    deviceId: String

})
const Party = mongoose.model('Party', PartyScheme)
exports.Party = Party