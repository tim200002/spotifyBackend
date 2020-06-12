//Important for Environmet Variables -> when not in Production load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

var express = require('express');
var router = express.Router();
const { Party } = require('../models/party')
const { User } = require('../models/user')

const eventBus = require('../eventBus')

var NewSpotifyApi = require('../Classes/newSpotifyApi')
var newSpotifyApi = new NewSpotifyApi(
    process.env.client_Id,
    process.env.client_secret_key,
    process.env.redirect_uri
)


//Return all The Information about a Party
router.get('/', async (req, res) => {
    try {
        var party = await Party.findById(req.query.partyId)
        if (!party) return res.status(400).send("Couldnt find Party")
        console.log(party)
        var result = []
        party.playlist.forEach((item) => {
            result.push({
                artist: item.artist,
                songId: item.id,
                title: item.title,
                albumArt: item.albumArt
            })
        })
        //console.log(result)
        res.send(result)
    }
    catch (err) {
        res.status(400).send(err.message)
    }
}

);

//Join a Party
router.post("/join", async (req, res) => {
    try {
        console.log("User wants to join a Party for the First Time")
        var party = await Party.findById(req.body.partyId)
        if (!party) return res.status(400).send("Couldnt find Party")

        var user = await User.findById(req.body._id)
        if (!user) return res.status(400).send("Couldnt find User")
        if (user.parties == null) {
            user.parties = [push({
                id: party._id,
                isAdmin: false
            })]
        }
        else {
            var isAlready = false;
            user.parties.forEach((item) => {
                console.log(item.id)
                console.log(party._id)
                if (item.id.toString() == party._id.toString()) {
                    console.log("is Already")
                    isAlready = true
                }
            })
            if (isAlready == false) {
                console.log("new")
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
        return res.status(400).send("Unknown Error at Join")
    }
}
)

//Create a Party a valid user Id must exist
router.post('/', async (req, res) => {
    console.log("User: " + req.body._id + " tried to Create a Party")
    var user = await User.findById(req.body._id)
    var party = new Party({
        name: req.body.name,
        //Create unique party Id later
        Playlist: [],
        user: req.body._id
    })
    party = await party.save()
    //Make sure there is a party array at User
    user.parties ? !null : user.parties = []
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
);


//Vote either new song or not
//Sorts List after and returns sorted List
router.post('/vote', async (req, res) => {
    console.log(req.body)
    var party = await Party.findById(req.body.id)
    if (!party) return res.status(400).send("Party not found")
    //Does Playlist contain Song
    for (var i = 0; i < party.playlist.length; i++) {
        if (party.playlist[i].id == req.body.songId) {
            party.playlist[i].votes++
            //Sort
            var first = party.playlist[0]
            var rest = party.playlist.slice(1)
            //Sort Rest:
            rest.sort((a, b) => b.votes - a.votes)
            console.log(rest)
            party.playlist = [first].concat(rest)
            party = await party.save();
            res.send(party.playlist) //
            eventBus.emit("playlistUpdate", { socketId: party.socketId, playlist: party.playlist, partyId: party._id })
            return
        }
    }
    //Song not found add
    party.playlist.push({
        id: req.body.songId,
        artist: req.body.artist,
        title: req.body.title,
        albumArt: req.body.albumArt,
        votes: 1
    })
    await party.save()
    eventBus.emit("playlistUpdate", { socketId: party.socketId, playlist: party.playlist, partyId: party._id })
    res.send(party.playlist)
})


//If user has right Skip to next Track
router.get('/skip', async (req, res) => {
    var party = await Party.findById(req.query.partyId)
    //Not the right to skip
    if (req.query._id != party.user) {
        return res.status(401).send("You are not authorized to Skip a Track")
    }

    //All Good
    if (party.playlist != null && party.playlist.length > 0) {
        party.playlist = party.playlist.slice(1)
        party = await party.save();
        //! Call Spotify Api to Skip by playing next song
        const user = await User.findById(party.user)
        console.log(user)
        const accessToken = await user.isAccessValid()
        console.log("Skipped")
        newSpotifyApi.play(accessToken, party.deviceId, party.playlist[0].id) //We dont need to fire an event does it automatically
        eventBus.emit("playlistUpdate", { socketId: party.socketId, playlist: party.playlist, partyId: party._id })
        return res.send(party.playlist[0])
    }
    return res.status(400) //Not sure if Status right
})

//Toggle
router.get('/toggle', async (req, res) => {
    try {
        var party = await Party.findById(req.query.partyId)
        var user = await User.findById(party.user)
        var accessToken = await user.isAccessValid()
        //Not the right to Toogle
        if (req.query._id != party.user) {
            return res.status(401).send("You are not authorized to Toogle Playbak")
        }

        //All Good
        var currentPlaying = await newSpotifyApi.getCurrentTrack(accessToken)

        //No track to play
        if (party.playlist.length == 0) return res.send("No Tracks to Play")

        //No current Playback -> start Playback
        if (currentPlaying == "") {
            newSpotifyApi.play(accessToken, party.deviceId, party.playlist[0].id)
            return res.send("Started Song")
        }
        //There is current Playback

        //First check if current Track matches first in que -> not play
        if (currentPlaying.item.id != party.playlist[0].id) {
            newSpotifyApi.play(accessToken, party.deviceId, party.playlist[0].id)

            return res.send("All Good")
        }
        //Else is pause -> play or isplaying -> pause
        else {
            if (currentPlaying.is_playing) {
                newSpotifyApi.pause(accessToken, party.deviceId)
                res.send("paused")
            }
            else {
                newSpotifyApi.resume(accessToken, party.deviceId)
                res.send("resumed")
            }
        }

    }
    catch (err) {
        res.send("Error Toggling").status(400)
    }
})
//Returns Object of all the Parties from a user and if he is admin
//Return all The Information about a Party
router.get('/myParties', async (req, res) => {
    console.log("User Aked for his Parties")
    var user = await User.findById(req.query._id)
    if (!user) return res.status(401).send("User Not Found")
    var subscribedParties = []
    for (var i = 0; i < user.parties.length; i++) {
        var party = await Party.findById(user.parties[i].id)
        subscribedParties.push({
            name: party.name,
            isAdmin: user.parties[i].isAdmin,
            partyId: user.parties[i].id
        })
    }
    console.log(subscribedParties)
    res.send(subscribedParties)
}
);

router.get('/accessToken', async (req, res) => {
    var party = await Party.findById(req.query.partyId)
    var user = await User.findById(party.user)
    var accessToken = await user.isAccessValid()
    console.log("Acces Token" + accessToken)
    res.send({ accessToken: accessToken })
})
module.exports = router