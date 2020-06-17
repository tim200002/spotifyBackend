//Important for Environmet Variables -> when not in Production load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

var express = require('express');
var router = express.Router();
const { Party } = require('../models/party')
const { User } = require('../models/user')

const eventBus = require('../eventBus')

//Create a Spotify API instance
var NewSpotifyApi = require('../Classes/newSpotifyApi')
var newSpotifyApi = new NewSpotifyApi(
    process.env.client_Id,
    process.env.client_secret_key,
    process.env.redirect_uri
)


//Return all the Songs from a Playlist
router.get('/', async (req, res) => {
    try {
        var party = await Party.findById(req.query.partyId)
        if (!party) return res.status(400).send("Couldnt find Party")
        var result = []
        party.playlist.forEach((item) => {
            result.push({
                artist: item.artist,
                songId: item.id,
                title: item.title,
                albumArt: item.albumArt,
                users: item.users,
            })
        })
        res.send(result)
    }
    catch (err) {
        console.log("Error in Endpoint get (Party)")
        console.log(err.message)
        res.status(400).send(err.message)
    }
}
);

//Join a Party -> PartyId gets stored in ones own party Array
router.post("/join", async (req, res) => {
    try {
        var party = await Party.findById(req.body.partyId)
        if (!party) return res.status(400).send("Couldnt find Party")

        var user = await User.findById(req.body._id)
        if (!user) return res.status(400).send("Couldnt find User")

        //If there is no Party Array yet-> make Array and Push new
        //!Code looks bad -> why push in Array
        if (user.parties == null) {
            user.parties = [push({
                id: party._id,
                isAdmin: false
            })]
        }
        //Partyarray exitsts 
        else {

            //Check if user already joined this Party
            var isAlready = false;
            user.parties.forEach((item) => {
                if (item.id.toString() == party._id.toString()) {
                    isAlready = true
                }
            })

            //User didn't joined the Party yet-> add Party to User
            if (isAlready == false) {
                user.parties.push({
                    id: party._id,
                    isAdmin: false
                })
            }
        }
        user = await user.save();
        res.send({ _id: party._id, partyName: party.name })
    }
    catch (err) {
        console.log("Error in Endpoint post join")
        console.log(err.message)
        return res.status(400).send(err.message)
    }
}
)

//Create a Party a valid user Id must exist
router.post('/', async (req, res) => {
    try {
        var user = await User.findById(req.body._id)
        var party = new Party({
            name: req.body.name,
            Playlist: [],
            user: req.body._id,
        })
        party = await party.save()
        //Make sure there is a party array at User
        user.parties ? !null : user.parties = []  //Check if usere has a Party Array
        user.parties.push({
            id: party._id,
            isAdmin: true
        })
        user = await user.save()

        res.send({
            _id: party._id,
            partyName: party.name
        })
    }
    catch (err) {
        console.log("Error in Endpoint post (party)")
        console.log(err.message)
        res.status(400).send(err.message)
    }
}
);


//Vote for Song
router.post('/vote', async (req, res) => {
    try {
        var party = await Party.findById(req.body.id)
        if (!party) return res.status(400).send("Party not found")
        var user = await User.findById(req.body.userId)
        if(!user) return res.status(400).send("User not found")
        //Is the Song already in the Playlist -> then vote for the Song
        for (var i = 0; i < party.playlist.length; i++) {
            if (party.playlist[i].id == req.body.songId) {
                party.playlist[i].votes++
                //App should check if user already voted
                //Nevertheless here again check;
                if(!party.playlist[i].voters.include(user._id)){
                    party.playlist[i].voters.push(user._id)
                }
                //Sort
                var first = party.playlist[0]
                var rest = party.playlist.slice(1)
                //Sort Rest:
                rest.sort((a, b) => b.votes - a.votes)
                party.playlist = [first].concat(rest)
                party = await party.save();
                res.send(party.playlist) //
                eventBus.emit("playlistUpdate", { socketId: party.socketId, playlist: party.playlist, partyId: party._id }) //notify all Listenes so Websocket updates all listening Sockets
                return
            }
        }
        //Song not found in the Playlist -> add Song to Playlist
        party.playlist.push({
            id: req.body.songId,
            artist: req.body.artist,
            title: req.body.title,
            albumArt: req.body.albumArt,
            votes: 1,
            users:[user._id]
        })
        await party.save()
        eventBus.emit("playlistUpdate", { socketId: party.socketId, playlist: party.playlist, partyId: party._id }) //notify all Listenes so Websocket updates all listening Sockets
        res.send(party.playlist)
    }
    catch (err) {
        console.log("Error in Endpoint post vote")
        console.log(err.message)
        res.status(400).send(err.message)
    }
})


//if User is creator of the Party he has the Right so Skip Songs
router.get('/skip', async (req, res) => {
    try {
        var party = await Party.findById(req.query.partyId)
        //is the user eligible to Skip
        if (req.query._id != party.user) {
            return res.status(401).send("User isn't eligible to Skip. Only creator of Party may Skip") //Not eleigible
        }

        //User is elegible

        //Is the Plaxlist long enough so skipping is valid -> alt least two Songs
        //!Check if length>0 or length >1
        if (party.playlist != null && party.playlist.length > 1) {
            party.playlist = party.playlist.slice(1) //Delete first Song from Playlist
            party = await party.save();
            //Call Spotify Api to Skip by playing next song
            const user = await User.findById(party.user)
            const accessToken = await user.isAccessValid()
            //! Maybe check if still Playlist at the End if not pause
            newSpotifyApi.play(accessToken, party.deviceId, party.playlist[0].id) //We dont need to fire an event does it automatically
            eventBus.emit("playlistUpdate", { socketId: party.socketId, playlist: party.playlist, partyId: party._id }) //Notifyl all listenes therefor notify all Websockets
            return res.send(party.playlist[0])
        }
        return res.status(400).send("There are to few songs -> Skipping isn't valid") //Not sure if Status right
    }
    catch (err) {
        console.log("Error in Endpoint get skip")
        console.log(err.message)
        res.status(400).send(err.message)
    }
})

//Toggle: Play->Pause and Pause->Play
router.get('/toggle', async (req, res) => {
    try {
        var party = await Party.findById(req.query.partyId)
        var user = await User.findById(party.user)
        var accessToken = await user.isAccessValid()
        //Not the right to Toogle -> only Creator has the Rigth to Toggle
        if (req.query._id != party.user) {
            return res.status(401).send("You are not authorized to Toogle Playback. Only the Creator has the right")
        }

        //Eligible to Toggle
        var currentPlaying = await newSpotifyApi.getCurrentTrack(accessToken)

        //Playlist is empty -> no Tracks to play
        if (party.playlist.length == 0) return res.send("Playlist is empty -> cant't toggle Playback")

        //No current Playback playing -> start Playback with first Song from Playlist
        if (currentPlaying == "") {
            await newSpotifyApi.play(accessToken, party.deviceId, party.playlist[0].id)
            
            return res.send("Started Playback")
        }
        //There is current Playback 
        //First check if current Track matches first in playlist
        if (currentPlaying.item.id != party.playlist[0].id) {
            //Wrong Song from another Session -> play Right Song
            await newSpotifyApi.play(accessToken, party.deviceId, party.playlist[0].id)
            return res.send("Started Playback")
        }
        //Else Tracks matched therefore in right session
        else {
            //Music Playing -> pause Music
            if (currentPlaying.is_playing) {
                await newSpotifyApi.pause(accessToken, party.deviceId)
                res.send("Playback paused")
                
            }
            //Music Paused -> play
            else {
                await newSpotifyApi.resume(accessToken, party.deviceId)
                res.send("playback resumed")
            }
        }

    }
    catch (err) {
        console.log("Error in Endpoint get toggle")
        console.log(err.message)
        res.status(400).send("Error in Endpoint get toggle")
    }
})


//Returns Object of all the Parties from a user and if he is admin
router.get('/myParties', async (req, res) => {
    try{
    var user = await User.findById(req.query._id)
    if (!user) return res.status(401).send("User Not Found")

    //Iterate over all Parties from a user to Return parties in slightly different format
    var subscribedParties = []
    for (var i = 0; i < user.parties.length; i++) {
        var party = await Party.findById(user.parties[i].id)
        subscribedParties.push({
            name: party.name,
            isAdmin: user.parties[i].isAdmin,
            partyId: user.parties[i].id
        })
    }
    res.send(subscribedParties)
}
catch(err){
    console.log("Error in Endpoint get myParties")
    console.log(err.message)
    res.status(400).send(err.message)
}
}
);

//Return the current acces Token beloning to a Party
//Function is used to self validate the Web Playback SDK
//!I believe this Function is only for the WebSDK therefore should be moved in the belonigng Route
router.get('/accessToken', async (req, res) => {
    try{
    var party = await Party.findById(req.query.partyId)
    if(!party) return res.status(400).send("Couldn't find Party")
    var user = await User.findById(party.user)
    if(!user) return res.send("Couldn't find user")
    var accessToken = await user.isAccessValid() //Get the newest acces Token
    res.send({ accessToken: accessToken })
    }
    catch(err){
        console.log("Error in Endpoint get accessToken")
        console.log(err.message)
        res.status(400).send(err.message)
    }

})
module.exports = router