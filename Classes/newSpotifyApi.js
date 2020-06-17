const axios = require('axios');
const qs = require('querystring');
const { resolve } = require('path');

class NewSpotifyApi {
    constructor(clientID, clientSecretKey, redirectUri) {
        this.clientID = clientID;
        this.clientSecretKey = clientSecretKey;
        this.redirectUri = redirectUri;
    }


    //Function to Call to get Access Token via auth Token from Login at Spotify
    //Returns {"acess_token": value, "refresh_token": value, "issue_time": time.now()}
    getAccesToken(authToken) {
        const requestBody = {
            grant_type: "authorization_code",
            code: authToken,
            redirect_uri: this.redirectUri,
            client_id: this.clientID,
            client_secret: this.clientSecretKey
        }
        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }
        return new Promise((resolve, reject) => {
            axios.post('https://accounts.spotify.com/api/token', qs.stringify(requestBody), config)
                .then(async (result) => {
                    this.accessToken = result['data'].access_token;
                    this.refreshToken = result['data'].refresh_token;

                    this.accesTokenTime = Date.now();
                    const dict = {
                        "acces_token": this.accessToken,
                        "refresh_token": this.refreshToken,
                        "issue_time": Date.now(),
                    };
                    resolve(dict);
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI get AccessToken")
                    console.log(err.message);
                    reject("Error Getting Acces Token")
                })
        })
    }

    //Can be used to refresh the Token after it turned invalid > 3600s
    //Thererfore Refresht Token is needed
    //Returns {"acces_token": value, "issue_time": time.now()}
    refreshAccesToken(refreshToken) {
        let help = this.clientID + ':' + this.clientSecretKey;
        let buff = new Buffer(help);
        help = buff.toString('base64');

        const config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + help
            }
        }
        const requestBody = {
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }
        return new Promise((resolve, reject) => {
            axios.post("https://accounts.spotify.com/api/token", qs.stringify(requestBody), config)
                .then(async (result) => {
                    var accessToken = result['data'].access_token;
                    var issueTime = Date.now();
                    resolve({ "acces_token": accessToken, "issue_time": issueTime });
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI refreshAccessToken")
                    console.log(err.message);
                    reject("Couldnt refresh the Access Token");
                })
        })
    }

    //!Functions to Interact with the API
    getUserPlaylists(accessToken) {
        const config = {
            headers: {
                'Authorization': "Bearer " + accessToken,
            }
        };


        return new Promise((resolve, reject) => {
            axios.get("https://api.spotify.com/v1/me/playlists", config)
                .then((result) => {
                    resolve(result);
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI get getUserPlaylists")
                    console.log(err.message);
                    reject("Couldnt get Playlists");
                })
        }
        );
    }


    async createPlaylist(accessToken, PlaylistName) {
        const config = {
            headers: {
                'Content-Type': "application/json",
                'Authorization': "Bearer " + accessToken,
            }
        };
        const reqBody = {
            name: PlaylistName,
            public: "false"
        };
        //Get Current user
        const userId = await this.getUserId(accessToken);
        return new Promise((resolve, reject) => {

            this.getUserId((userId) => {
                axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`, reqBody, config)
                    .then((result) => {
                        resolve(result.data);

                    })
                    .catch((err) => {
                        console.log("Error in SpotifyAPI get createPlaylist (inner Catch)")
                        console.log(err.message);
                        reject("Couldnt Create Playlist");
                    })
            })
                .catch((err) => {
                    console.log("Error in SpotifyAPI get AccessToken (outer Catch)")
                    console.log(err.message)
                    reject("Couldnt find User belonging to Accesstoken")
                })


        }
        );
    }

    //Get the User Id connected with the accessToken
    getUserId(accessToken) {
        const config = {
            headers: {
                'Authorization': "Bearer " + accessToken,
            }
        };

        return new Promise((resolve, reject) => {
            axios.get("https://api.spotify.com/v1/me", config)
                .then((result) => {
                    resolve(result['data'].id);
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI getUserId")
                    console.log(err.message);
                    reject("Couldnt get User Id");
                })
        }
        );
    }

    //Search -> at the Moment Search only Tracks
    search(accessToken, query, queryType = "track", limit = 12) {
        const config = {
            params: {
                q: query,
                type: queryType,
                limit: limit

            },
            headers: {
                'Authorization': "Bearer " + accessToken,
            }
        };


        return new Promise((resolve, reject) => {
            axios.get(`https://api.spotify.com/v1/search`, config)
                .then((result) => {
                    resolve(result.data);
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI search")
                    console.log(err.message)
                    reject("Couldnt Search the SPotify API");
                })
        }
        );
    }


    play(accessToken, deviceId, songId) {
        const config = {
            headers: {
                'Authorization': "Bearer " + accessToken,
            },
            params: {
                device_id: deviceId
            }
        }

        const reqBody = {
            uris: [`spotify:track:${songId}`]
        }

        return new Promise((resolve, reject) => {
            axios.put("https://api.spotify.com/v1/me/player/play", reqBody, config)
                .then((result) => {
                    resolve("Succes Playing Song")
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI play")
                    console.log(err.message)
                    reject(err.message)
                })
        })
    }
    resume(accessToken, deviceId) {
        const config = {
            headers: {
                'Authorization': "Bearer " + accessToken,
            },
            params: {
                device_id: deviceId
            }
        }
        //No Real Need for async i guess but this makes interface more equal
        return new Promise((resolve,reject)=>{
            axios.put("https://api.spotify.com/v1/me/player/play", {}, config)
            .then((result) => {
                console.log("Succes Resuming Song")
                resolve("Resumed")
            })
            .catch((err) => {
                console.log("Error in SpotifyAPI resume")
                console.log(err.message)
                reject(err.message)
            })
        })

       
    }

    pause(accessToken, deviceId) {
        const config = {
            headers: {
                'Authorization': "Bearer " + accessToken,
            },

        }

        //No Real Need for async i guess but this makes interface more equal
        return new Promise((resolve, reject) => {
            axios.put("https://api.spotify.com/v1/me/player/pause?device_id=" + deviceId, {}, config)
                .then((result) => {
                    resolve("Paused")
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI pause")
                    console.log(err.message)
                    reject(err.message)
                })
        })
    }

    getCurrentTrack(accessToken) {
        const config = {
            headers: {
                'Authorization': "Bearer " + accessToken,
            },
        }

        return new Promise((resolve, rejcet) => {
            axios.get("https://api.spotify.com/v1/me/player/currently-playing", config)
                .then((result) => {
                    resolve(result.data)
                })
                .catch((err) => {
                    console.log("Error in SpotifyAPI getCurrentTrack")
                    console.log(err.message)
                    reject(err.message)
                })
        })
    }
}

module.exports = NewSpotifyApi;