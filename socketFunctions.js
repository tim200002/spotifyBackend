
//Important for Environmet Variables -> when not in Production load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
var NewSpotifyApi=require('./Classes/newSpotifyApi')
const { Party } = require('./models/party')
const { User } = require('./models/user')

var newSpotifyApi= new NewSpotifyApi(
    process.env.client_Id,
    process.env.client_secret_key,
    process.env.redirect_uri
)

socketFunctions = {
async skip(partyId){
    var party = await Party.findById(partyId)
    const user = await User.findById(party.user)
    await user.isAccessValid()
    //Change Party Playlis
    party.playlist=party.playlist.slice(1)
    party=await party.save();
    if(party.playlist.length == 0) {console.log("No Song To Play in Que"); return} 
    console.log(party.playlist[0].id)
    newSpotifyApi.play(user.accessToken, party.deviceId, party.playlist[0].id) //Await not Necessary here
},

}
module.exports = socketFunctions


