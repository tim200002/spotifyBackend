
//These are Functions Called from within the Websocket


//Important for Environmet Variables -> when not in Production load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
var NewSpotifyApi=require('./Classes/newSpotifyApi')
const { Party } = require('./models/party')
const { User } = require('./models/user');
const { use } = require('./routes/user');
const eventBus = require('./eventBus')

//Create instance of Spotify API
var newSpotifyApi= new NewSpotifyApi(
    process.env.client_Id,
    process.env.client_secret_key,
    process.env.redirect_uri
)

//Socket Function Class
socketFunctions = {

//After a track ENED Skip to new Track
async skip(partyId){
    try{
    var party = await Party.findById(partyId)
    const user = await User.findById(party.user)
    if(!party ||!user) throw("Couldnt find Party or User")
    
    var accessToken = await user.isAccessValid()
    //Change Party Playlis
    //If Music is playigng at least one Song is i playlist (current Song)
    party.playlist=party.playlist.slice(1) //Delte first Song from Playlist
    party=await party.save();
    //Ceck if there is a new Song to Play
    if(party.playlist.length == 0) {console.log("Playlist is Empty"); return} 
    newSpotifyApi.play(accessToken, party.deviceId, party.playlist[0].id) //Await not Necessary here
    //Update all Listeners that change occured
    eventBus.emit("playlistUpdate", { socketId: party.socketId, playlist: party.playlist, partyId: party._id }) //notify all Listenes so Websocket updates all listening Sockets
    
    }
    catch(err){
        console.log("Error in Socket Function skip")
        console.log(err.message)
    }
},

}
module.exports = socketFunctions


