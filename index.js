//Entry Poit for the Application

var express = require('express');
var app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
var http = require('http');
var { Party } = require('./models/party')
var socketFunctions = require('./socketFunctions')
//Require Routes
var SpotifyValidationRoutes = require('./routes/loginWithSpotify');
var userRoutes = require('./routes/user');
var searchRoutes = require('./routes/search');
var partyRoutes = require('./routes/party')
//Important for Environmet Variables -> when not in Producation load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

var eventBus = require('./eventBus')



mongoose.connect('mongodb+srv://tim200002:' + process.env.database_Password + '@cluster0-jmtc0.mongodb.net/Jukebox?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to DB"))
    .catch(err => console.log("Error Connecting to DB"));
var scopes = 'user-read-private user-read-email playlist-read-private';

app.use(express.json());
app.use('/user', userRoutes);
app.use('/search', searchRoutes);
app.use('/party', partyRoutes);
app.use(SpotifyValidationRoutes);


//!Event Handles which work directly with the io
//When voted in a party update all listeners
//Later maybe a room could be ideal
eventBus.on("playlistUpdate", (data) => {
    console.log("voted" + data.socketId)
    console.log("in room: "+data.partyId)
    io.of('webapp').to(data.socketId).emit("update", { queue: data.playlist })
    io.of("appsock").to(data.partyId).emit("update")

})

//!Namespace for all Socket Connections with the Webapp
//!Todo Clean in Extra File
websock = io.of('/webapp')
//Webscoket Handling
websock.on('connection', async (socket) => {
    var party = null
    console.log("Connection")
    //When a song is over or stopped
    var lastSongChange = Date.now()
    socket.on('player_state_changed', async (data) => {
        console.log("state Changed")

        //Decide if Song is over over when Time = 0000 and paused = true
        if (data.position == 0 && data.paused == true && Date.now() - lastSongChange > 500) {
            lastSongChange = Date.now()
            console.log("Track Ended")
            socketFunctions.skip(data.partyId)
            const party = await Party.findById(data.partyId)
            console.log("emit")
            //When updated return list of all Songs back to Website so website can construct a live playlist
            io.to(socket.id).emit("update", { queue: party.playlist })
        }
        else if (data.position == 0 && data.paused == false && Date.now() - lastSongChange > 500) {
            lastSongChange = Date.now()
            console.log("Track Skipped")
            //socketFunctions.skip(data.partyId)
        }
    });

    socket.on("device_id", async (data) => {
        console.log("Connect")
        //Own Part ybecause it my happen, tht party isn't set yet
        party = await Party.findById(data.partyId)
        party.socketId = socket.id
        party.deviceId = data.device_id
        await party.save()
    })

    socket.on('disconnect', () => {
        if (party == null) return
        //Else Delete REference
        party.socketId = null
        party.save()
    })
});

//!Websocket for App
appsock = io.of('/appsock')
appsock.on('connection',(socket)=>{
    socket.on("room",(room)=>{     
        socket.join(room)
        console.log("App joied room: "+ room);
    })
})



const port = process.env.PORT || 8080;
//app.listen(port,  () =>console.log("Webserver started on port "+ port));
server.listen(port, () => console.log("Webserver started on port " + port))

