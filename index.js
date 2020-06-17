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
var partyRoutes = require('./routes/party');
var webSdkRoutes=require('./routes/webSdk')



//Important for Environmet Variables -> when not in Producation load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

//Event Bus on which all Events are emitted
var eventBus = require('./eventBus')


//Connect to remote mongoose Server
mongoose.connect('mongodb+srv://tim200002:' + process.env.database_Password + '@cluster0-jmtc0.mongodb.net/Jukebox?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to DB"))
    .catch(err => console.log("Error Connecting to DB"));



app.use(express.json());
app.use('/user', userRoutes);
app.use('/search', searchRoutes);
app.use('/party', partyRoutes);
app.use('/webSDK', webSdkRoutes);
app.use(SpotifyValidationRoutes);



//!Event Handler
//When voted in a party update all listeners
eventBus.on("playlistUpdate", (data) => {
    console.log("voted" + data.socketId)
    console.log("in room: "+data.partyId)
    io.of('webapp').to(data.socketId).emit("update", { queue: data.playlist }) //Emit to the specifierd Webapp
    io.of("appsock").to(data.partyId).emit("update") //Emit to all the APPs in the Party namespace

})

//!Websockets
//? one could mayber combine the different namespaces -> but I personally like it like this
 
//Namespace for all Socket Connections with the Webapp
websock = io.of('/webapp')
//Webscoket Handling
websock.on('connection', async (socket) => {
    var party = null
    console.log("Connection with WebSDK")

    //Time when the last SongChanged occured -> is important to recognize if state change is a song ending then we need to play the next Song
    var lastSongChange = Date.now()
    socket.on('player_state_changed', async (data) => {
        //Decide if Song is over over when Time = 0000 and paused = true + Enought Time since last change
        if (data.position == 0 && data.paused == true && Date.now() - lastSongChange > 500) {
            lastSongChange = Date.now()
            socketFunctions.skip(data.partyId)
            const party = await Party.findById(data.partyId)
            //When updated return list of all Songs back to Website so website can construct a live playlist
            //io.to(socket.id).emit("update", { queue: party.playlist }) //!Update happends automaticly in Skip by calling on the Event Bus
        }
        else if (data.position == 0 && data.paused == false && Date.now() - lastSongChange > 500) {
            //!Is this part usefull for something
            lastSongChange = Date.now()
            console.log("Track Skipped")
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

