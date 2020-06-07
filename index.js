//Entry Poit for the Application

var express = require('express');
var app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
var http = require('http');
var {Party} = require('./models/party')
var socketFunctions = require('./socketFunctions')
//Require Routes
var SpotifyValidationRoutes=require('./routes/loginWithSpotify');
var userRoutes=require('./routes/user');
var searchRoutes= require('./routes/search');
var partyRoutes = require('./routes/party')
//Important for Environmet Variables -> when not in Producation load important variables from file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}


mongoose.connect('mongodb+srv://tim200002:'+process.env.database_Password+'@cluster0-jmtc0.mongodb.net/Jukebox?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log("Connected to DB"))
    .catch(err => console.log("Error Connecting to DB"));
var scopes = 'user-read-private user-read-email playlist-read-private';

app.use(express.json());
app.use('/user', userRoutes);
app.use('/search', searchRoutes);
app.use('/party', partyRoutes);
app.use(SpotifyValidationRoutes);

//Webscoket Handling
io.on('connection', async(socket)=>{
    var party = null
    console.log("Connection")
    /*try{
    const partyId = socket.handshake.query['partyId']
    console.log(partyId)
    party = await Party.findById(partyId)
    party.socketId=socket.id
    console.log(party)
    await party.save()
    }

    catch(err){
        console.log("Error connecting to socket")
    }
    */
    //socket.emit('news', { hello: 'world' });
    
    //When a song is over or stopped
    var lastSongChange = Date.now()
    socket.on('player_state_changed', (data) => {
        console.log("state Changed")

        //Decide if Song is over over when Time = 0000 and paused = true
        if(data.position == 0 && data.paused == true &&Date.now()-lastSongChange> 500){
            lastSongChange = Date.now()
            console.log("Track Ended")
            socketFunctions.skip(data.partyId)
        }
        else if(data.position==0 && data.paused == false&&Date.now()-lastSongChange> 500){
            lastSongChange = Date.now()
            console.log("Track Skipped")
            //socketFunctions.skip(data.partyId)
        }
      });

      socket.on("device_id", async (data)=>{
          console.log("Connect")
          //Own Part ybecause it my happen, tht party isn't set yet
          party = await Party.findById(data.partyId)
          party.socketId=socket.id
          party.deviceId = data.device_id
          await party.save()
      })

    socket.on('disconnect', ()=>{
        if (party == null) return 
        //Else Delete REference
        party.socketId=null
        party.save()
    })
})



const port = process.env.PORT || 8080;
//app.listen(port,  () =>console.log("Webserver started on port "+ port));
server.listen(port,  () =>console.log("Webserver started on port "+ port))

