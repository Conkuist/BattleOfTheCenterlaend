let playerStates =
    [
        {
            "playerName" : "Player1",
            "currentPosition": [3, 8],
            "spawnPosition": [3, 9],
            "direction": "NORTH",
            "character": "FRODO",
            "lives": 3,
            "lembasCount": 5,
            "suspended": 0,
            "reachedCheckpoints": 0,
            "playedCards":
            [
            "MOVE_1",
            "MOVE_2"
            ],
            "turnOrder": 2
        },
        {
            "playerName" : "Player2",
            "currentPosition": [6, 8],
            "spawnPosition": [6, 9],
            "direction": "EAST",
            "character": "GANDALF",
            "lives": 3,
            "lembasCount": 5,
            "suspended": 0,
            "reachedCheckpoints": 0,
            "playedCards":
            [
            "MOVE_1",
            "MOVE_2"
            ],
            "turnOrder": 2
        }
    ];

let boardState =
    {
        "lembasFields" :
        [
        {
            "position" : [0,9],
            "amount" : 6
        },
        {
            "position" : [9,0],
            "amount" : 6
        }
        ]
    };

let clients = [];
let maxPlayerNameLength = 16;
let gameStarted = false;

let isString = value => typeof value === 'string' || value instanceof String;

function GameClient (ws,name,role)
{
    this.token = crypto.randomUUID();;
    this.ws = ws;
    this.name = name;
    this.role = role
    this.ready = false;
    this.addClient = (ws) => {

        let canJoin = true;

        if (GetClientsByRole("PLAYER").length > 6) {
            canJoin = false;
            SendError(ws, 5);
        }

        if (this.name > maxPlayerNameLength) {
            canJoin = false;
            SendError(ws, 3);
        }

        if (ClientNameExists(this.name)) {
            canJoin = false;
            SendError(ws, 2);
        }

        if (role == "PLAYER" || role == "AI") {

            if (gameStarted) {
                canJoin = false;
                SendError(ws, 4)
            }

            if (canJoin) {
                clients.push(this);
            }

        } else if (role == "SPECTATOR") {
            if (canJoin) {
                clients.push(this);
            }
        } else {
            canJoin = false;
            SendError(ws,0)
        }
        return canJoin;
    }
}

const fs = require('fs');

let boardcfgdata = fs.readFileSync('boardConfig.json');
let boardConfig = JSON.parse(boardcfgdata);

let gamecfgdata = fs.readFileSync('gameConfig.json');
let gameConfig = JSON.parse(gamecfgdata);

const crypto = require('crypto');



// Importing the required modules
const WebSocketServer = require('ws');

// Creating a new websocket server
const wss = new WebSocketServer.Server({ port: 8080 })
 
// Creating connection using websocket
wss.on("connection", ws => {

    console.log("new client connected");

    let msg
 
    //on message from client
    ws.on("message", json =>
    {
        try {
            msg = JSON.parse(json);
        }
        catch (e) {
            SendInvalidMessage(ws);
        }
        
        console.log(msg);
        
        if(Object.hasOwn(msg,"message"))
        {
            switch (msg.message)
            {
                case "HELLO_SERVER":
                
                    if(Object.hasOwn(msg,"data"))
                    {
                        if(Object.hasOwn(msg.data,"name") && Object.hasOwn(msg.data,"role"))
                        {
                            ws.player = msg.data.name;
                            ws.client = new GameClient(ws, msg.data.name, msg.data.role);
                        }
                    }

                    if(ws.client && ws.client.addClient(ws))
                    {
                        //console.log(players.length);
                        ws.token = ws.client.token;
                        SendHelloClient(ws,ws.client);
                        SendParticipantsInfo();
                    }
                    
                    break;
                    
                case "PLAYER_READY":
                    if(Object.hasOwn(msg,"data"))
                    {
                        if(Object.hasOwn(msg.data,"ready"))
                        {
                            ws.client.ready = msg.data.ready;

                            if(msg.data.ready && !gameStarted)
                            {
                                if(ws.client.role == "PLAYER" || ws.client.role == "AI") {
                                    ws.client.ready = msg.data.ready;
                                    SendParticipantsInfo();
                                    StartGame();
                                }
                            }
                        }
                    }
                    
                    break;
                    
                case "CHARACTER_CHOICE":
                
                    if(Object.hasOwn(msg,"data"))
                    {
                        if(Object.hasOwn(msg.data,"cards"))
                        {
                            ws.player = msg.data.name;
                        }
                    }
                    
                    SendGameState(ws);
                    
                    SendCardOffer(ws);
                
                    break;
                
                case "CARD_CHOICE":
                
                    SendRoundStart(ws);
                    
                    SendCardEvent(ws);
                    
                    SendShotEvent(ws);
                    
                    SendRiverEvent(ws);
                    
                    SendEagleEvent(ws);
                    
                    SendGameState(ws);
                    
                    SendGameEnd(ws);
                
                    break;
                
                case "GOODBYE_SERVER":
                    SendParticipantsInfo();
                    break;
                    
                case "PAUSE_REQUEST":
                
                    let ps = {}
                    ps.message = "PAUSED"
                    ps.data = {};
                    console.log(ws.player);
                    ps.data.playerName = ws.player;
                    ps.data.paused = false;
                    if(Object.hasOwn(msg,"data"))
                    {
                        if(Object.hasOwn(msg.data,"pause"))
                        {
                            ps.data.paused = msg.data.pause;
                        }
                    }
                    
                    json = JSON.stringify(ps);
                    
                    ws.send(json);
                    
                    break;
                    
                case "RECONNECT":
                
                    SendParticipantsInfo();
                    
                    break;
                    
                default:
                    console.log("UNKNOWN MESSAGE");
            }
        }
        
        if(Object.hasOwn(msg,"player"))
        {
            console.log(`Message from ${player} received`);
        }
        
    }
    );
 
    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        console.log("the client has disconnected");
    });
    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred")
    }
});

console.log("The WebSocket server is running on port 8080");

function GetClientsByRole(role)
{
    let clientsWithRole = []
    for(let client of clients)
    {
        if(client.role == role)
        {
            clientsWithRole.push(client);
        }
    }
    return clientsWithRole;
}

function ClientNameExists(name)
{
    for(let client of clients)
    {
        if(client.name == name)
        {
            return true;
        }
    }
    return false;
}

function SendError(websocket, errorCode)
{
    let msg = {}
    msg.message = "ERROR";
    msg.data = {};
    msg.data.errorCode = errorCode;
    msg.data.reason = "";
    json = JSON.stringify(msg);
    websocket.send(json);
}

function GetNames(role)
{
    clientNames = []
    for(let client of clients)
    {
        if(client.role == role)
        {
            clientNames.push(client.name)
        }
    }
    return clientNames
}

function GetReadyPlayers()
{
    let readyPlayers = []
    for(let player of GetClientsByRole("PLAYER"))
    {
        if(player.ready)
        {
            readyPlayers.push(player.name)
        }
    }
    return readyPlayers;
}

function StartGame()
{
    let allPlayersReady = true;

    let players = GetClientsByRole("PLAYER");

    for(let player of players)
    {
        if(player.ready == false)
        {
            allPlayersReady = false;
        }
    }

    if(players.length < 2)
    {
        allPlayersReady = false;
    }

    if(allPlayersReady) {
        gameStarted = true;

        for (let player of players) {
            SendGameStart(player.ws);
        }
        for (let player of players) {
            SendCharacterOffer(player.ws);
        }
    }
}

function SendInvalidMessage(ws)
{
    let msg = {}
    msg.message = "INVALID_MESSAGE";
    msg.data = {};
    msg.data.invalidMesasge = json;
    let json = JSON.stringify(msg);
    ws.send(json);
    ws.close();
}

function SendHelloClient(websocket,client)
{
    let msg = {}
    msg.message = "HELLO_CLIENT";
    msg.data = {};
    msg.data.reconnectToken = client.token;
    msg.data.boardConfig = boardConfig;
    msg.data.gameConfig = gameConfig;
    let json = JSON.stringify(msg)
    websocket.send(json);
}

function SendParticipantsInfo()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = "PARTICIPANTS_INFO";
        msg.data = {};
        msg.data.players = GetNames("PLAYER");
        msg.data.spectators = GetNames("SPECTATOR");
        msg.data.ais = GetNames("AI")
        msg.data.readyPlayers = GetReadyPlayers();
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendGameStart(websocket)
{
    let msg = {};
    msg.message = "GAME_START";
    msg.data = {};
    let json = JSON.stringify(msg);
    websocket.send(json);
}

function SendRoundStart(websocket)
{
    let msg = {};
    msg.message = "ROUND_START";
    msg.data = {};
    msg.data.playerStates = playerStates
    let json = JSON.stringify(msg);
    websocket.send(json);
}

function SendCardEvent(websocket)
{
    let msg = {};
    msg.message = "CARD_EVENT";
    msg.data = {};
    msg.data.playerName = "Player1";
    msg.data.card = "MOVE_1";
    msg.data.playerStates = [playerStates,playerStates];
    msg.data.boardStates = [boardState,boardState]
    let json = JSON.stringify(msg);
    websocket.send(json);
}
                    
function SendShotEvent(websocket)
{
    let msg = {};
    msg.message = "SHOT_EVENT";
    msg.data = {};
    msg.data.shooterName = "Player1";
    msg.data.targetName = "Player2";
    msg.data.playerStates = playerStates;
    let json = JSON.stringify(msg);
    websocket.send(json);
}
                    
function SendRiverEvent(websocket)
{
    let msg = {};
    msg.message = "RIVER_EVENT";
    msg.data = {};
    msg.data.playerName = "Player1";
    msg.data.playerStates = [playerStates,playerStates];
    msg.data.boardStates = [boardState,boardState]
    let json = JSON.stringify(msg);
    websocket.send(json);
}
                    
function SendEagleEvent(websocket)
{
    let msg = {};
    msg.message = "EAGLE_EVENT";
    msg.data = {};
    msg.data.playerName = "Player1";
    msg.data.playerStates = playerStates;
    let json = JSON.stringify(msg);
    websocket.send(json);
}
                    
function SendGameEnd(websocket)
{
    let msg = {};
    msg.message = "GAME_END";
    msg.data = {};
    msg.data.playerStates = playerStates;
    msg.data.winner = "Player1";
    msg.data.additional = [];
    let json = JSON.stringify(msg);
    websocket.send(json);
}

function SendCharacterOffer(websocket)
{
    characters = ["FRODO","SAM","LEGOLAS","GIMLI","GANDALF","ARAGORN","GOLLUM","GALADRIEL","BOROMIR","BAUMBART","MERRY","PIPPIN","ARWEN"]
    
    let msg = {};
    msg.message = "CHARACTER_OFFER";
    msg.data = {};
    msg.data.characters = [];
    
    for(let i = 0; i < 2; i++)
    {
        characterIndex = getRandomIntInclusive(0, characters.length - 1);
        msg.data.characters.push(characters[characterIndex])
    }
    
    json = JSON.stringify(msg);
    websocket.send(json);
}

function SendGameState(websocket)
{
    let msg = {};
    msg.message = "GAME_STATE";
    msg.data = {};
    msg.data.playerStates = playerStates;
    msg.data.boardState = boardState
    msg.data.currentRound = 69;
    
    json = JSON.stringify(msg);
    websocket.send(json);
}

function SendCardOffer(websocket)
{
    cardtypes = ["MOVE_3","MOVE_2","MOVE_1","MOVE_BACK","U_TURN","RIGHT_TURN","LEFT_TURN","AGAIN","LEMBAS"]
    
    let msg = {};
    msg.message = "CARD_OFFER";
    msg.data = {};
    msg.data.cards = [];
    
    let ammount = getRandomIntInclusive(7, 9);
    
    for(let i = 0; i < ammount; i++)
    {
        cardIndex = getRandomIntInclusive(0, cardtypes.length - 1);
        msg.data.cards.push(cardtypes[cardIndex])
    }
    
    json = JSON.stringify(msg);
    websocket.send(json);
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}
