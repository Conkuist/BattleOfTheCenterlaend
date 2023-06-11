const fs = require('fs');

require('./enums');

let boardcfgdata = fs.readFileSync('boardConfig.json');
let boardConfig = JSON.parse(boardcfgdata);

let gamecfgdata = fs.readFileSync('gameConfig.json');
let gameConfig = JSON.parse(gamecfgdata);

const crypto = require('crypto');



// Importing the required modules
const WebSocketServer = require('ws');


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
let isBoolean = value => typeof  value === 'boolean' || value instanceof Boolean

function GameClient (ws,name,role)
{
    this.token = crypto.randomUUID();
    this.ws = ws;
    this.name = name;
    this.role = role
    this.ready = false;
    this.addClient = (ws) => {

        let canJoin = true;

        if (GetClientsByRole(Role.PLAYER).length > 6) {
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

        if (role == Role.PLAYER || role == Role.AI) {

            if (gameStarted) {
                canJoin = false;
                SendError(ws, 4)
            }

            if (canJoin) {
                clients.push(this);
            }

        } else if (role == Role.SPECTATOR) {
            if (canJoin) {
                clients.push(this);
            }
        } else {
            canJoin = false;
            SendError(ws,0)
        }
        return canJoin;
    }
    this.removeClient = () =>
    {
        let index = clients.indexOf(this);
        if(index != -1) {
            clients.slice(i, 1);
        }
    }
}


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
            if(ws.client,json)
            {
                ws.client.removeClient();
                ws.close();
            }
        }
        
        console.log(msg);
        
        if(Object.hasOwn(msg,"message"))
        {
            switch (msg.message)
            {
                case Message.HELLO_SERVER:
                
                    if(Object.hasOwn(msg,"data"))
                    {
                        if(Object.hasOwn(msg.data,"name") && Object.hasOwn(msg.data,"role"))
                        {
                            if(!gameStarted)
                            {
                                ws.client = new GameClient(ws, msg.data.name, msg.data.role);
                            }
                        }
                    }

                    if(!gameStarted && ws.client && ws.client.addClient(ws))
                    {
                        ws.token = ws.client.token;
                        SendHelloClient(ws,ws.client);
                        SendParticipantsInfo();
                    }
                    
                    break;
                    
                case Message.PLAYER_READY:
                    if(msg.hasOwnProperty("data") && msg.data.hasOwnProperty("ready"))
                    {
                         if(!gameStarted && isBoolean(msg.data.ready) && ws.client)
                         {
                            if(ws.client.role == Role.PLAYER || ws.client.role == Role.AI) {
                                ws.client.ready = msg.data.ready;
                                SendParticipantsInfo();
                                StartGame();
                             }
                         }

                    }
                    
                    break;
                    
                case Message.CHARACTER_CHOICE:
                
                    if(msg.hasOwnProperty("data"))
                    {
                        if(msg.data.hasOwnProperty("cards"))
                        {
                            ws.player = msg.data.name;
                        }
                    }
                    
                    SendGameState();
                    
                    SendCardOffer(ws);
                
                    break;
                
                case Message.CARD_CHOICE:
                
                    SendRoundStart(ws);
                    
                    SendCardEvent(ws);
                    
                    SendShotEvent(ws);
                    
                    SendRiverEvent(ws);
                    
                    SendEagleEvent(ws);
                    
                    SendGameState();
                    
                    SendGameEnd(ws);
                
                    break;
                
                case Message.GOODBYE_SERVER:
                    ws.client.removeClient();
                    SendParticipantsInfo();
                    break;
                    
                case Message.PAUSE_REQUEST:
                
                    let ps = {}
                    ps.message = Message.PAUSED;
                    ps.data = {};
                    //console.log(ws.player + "requested pause");
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
                    
                case Message.RECONNECT:

                    if(!this.client)
                    {

                        let rt = msg.data.reconnectToken

                        for (let client of clients) {

                            if(rt && client.token == rt)
                            {
                                ws.client = client;
                                ws.client.ws = ws;
                                break;
                            }

                        }
                        SendParticipantsInfo();
                    }
                    break;
                    
                default:
                    console.log("UNKNOWN MESSAGE");
            }
        }
        
    }
    );
 
    // handling what to do when clients disconnects from server
    ws.on("close", () => {
        if(ws.client.role == Role.PLAYER || ws.client.role == Role.AI)
        {
            if(!gameStarted && ws.client.ready == false)
            {
                ws.client.removeClient();
            }
        }
        console.log("the client has disconnected");
    });
    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred");
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
    msg.message = Message.ERROR;
    msg.data = {};
    msg.data.errorCode = errorCode;
    msg.data.reason = "";
    json = JSON.stringify(msg);
    websocket.send(json);
}

function GetNames(role)
{
    let clientNames = []
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
    for(let player of GetClientsByRole(Role.PLAYER))
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

    let players = GetClientsByRole(Role.PLAYER);

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

    if(allPlayersReady)
    {
        gameStarted = true;
        SendGameStart();
        SendCharacterOffer();
    }
}

function SendInvalidMessage(ws,invalidJson)
{
    let msg = {}
    msg.message = Message.INVALID_MESSAGE;
    msg.data = {};
    msg.data.invalidMesasge = invalidJson;
    let json = JSON.stringify(msg);
    ws.send(json);
    ws.close();
}

function SendHelloClient(websocket,client)
{
    let msg = {}
    msg.message = Message.HELLO_CLIENT;
    msg.data = {};
    msg.data.reconnectToken = client.token;
    msg.data.boardConfig = boardConfig;
    msg.data.gameConfig = gameConfig;
    let json = JSON.stringify(msg)
    websocket.send(json);
    console.log(`${client.name} joined the game`);
}

function SendParticipantsInfo()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.PARTICIPANTS_INFO;
        msg.data = {};
        msg.data.players = GetNames(Role.PLAYER);
        msg.data.spectators = GetNames(Role.SPECTATOR);
        msg.data.ais = GetNames(Role.AI)
        msg.data.readyPlayers = GetReadyPlayers();
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendGameStart()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.GAME_START;
        msg.data = {};
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
    console.log("game started");
}

function SendRoundStart(websocket)
{
    let msg = {};
    msg.message = Message.ROUND_START;
    msg.data = {};
    msg.data.playerStates = playerStates
    let json = JSON.stringify(msg);
    websocket.send(json);
}

function SendCardEvent(websocket)
{
    let msg = {};
    msg.message = Message.CARD_EVENT;
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
    msg.message = Message.SHOT_EVENT;
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
    msg.message = Message.RIVER_EVENT;
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
    msg.message = Message.EAGLE_EVENT;
    msg.data = {};
    msg.data.playerName = "Player1";
    msg.data.playerStates = playerStates;
    let json = JSON.stringify(msg);
    websocket.send(json);
}
                    
function SendGameEnd(websocket)
{
    let msg = {};
    msg.message = Message.GAME_END;
    msg.data = {};
    msg.data.playerStates = playerStates;
    msg.data.winner = "Player1";
    msg.data.additional = [];
    let json = JSON.stringify(msg);
    websocket.send(json);
}


function SendCharacterOffer()
{
    let characters = [
        Character.FRODO,
        Character.SAM,
        Character.LEGOLAS,
        Character.GIMLI,
        Character.GANDALF,
        Character.ARAGORN,
        Character.GOLLUM,
        Character.GALADRIEL,
        Character.BOROMIR,
        Character.BAUMBART,
        Character.MERRY,
        Character.PIPPIN,
        Character.ARWEN
    ]

    let offeredCharacters = [];

    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI))) {

        let msg = {};
        msg.message = Message.CHARACTER_OFFER;
        msg.data = {};
        msg.data.characters = [];

        while(msg.data.characters.length < 2 && characters.length - offeredCharacters.length >= msg.data.characters.length)
        {
            let characterIndex = getRandomIntInclusive(0, characters.length - 1);

            if(!offeredCharacters.includes(characters[characterIndex]))
            {
                offeredCharacters.push(characters[characterIndex]);
                msg.data.characters.push(characters[characterIndex]);
            }
        }

        client.offeredCharacters = msg.data.characters;

        json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendGameState()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.GAME_STATE;
        msg.data = {};
        msg.data.playerStates = playerStates;
        msg.data.boardState = boardState
        msg.data.currentRound = 69;

        json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendCardOffer(websocket)
{
    let cardTypes = [
        Card.MOVE_3,
        Card.MOVE_2,
        Card.MOVE_1,
        Card.MOVE_BACK,
        Card.U_TURN,
        Card.RIGHT_TURN,
        Card.LEFT_TURN,
        Card.AGAIN,
        Card.LEMBAS
    ]
    
    let msg = {};
    msg.message = Message.CARD_OFFER;
    msg.data = {};
    msg.data.cards = [];
    
    let amount = getRandomIntInclusive(7, 9);
    
    for(let i = 0; i < amount; i++)
    {
        cardIndex = getRandomIntInclusive(0, cardTypes.length - 1);
        msg.data.cards.push(cardTypes[cardIndex])
    }
    
    json = JSON.stringify(msg);
    websocket.send(json);
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}
