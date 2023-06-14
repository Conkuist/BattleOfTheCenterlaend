const fs = require('fs');

require('./enums');

let boardConfigData = fs.readFileSync('boardConfig.json');
let boardConfig = JSON.parse(boardConfigData);

let gameConfigData = fs.readFileSync('gameConfig.json');
let gameConfig = JSON.parse(gameConfigData);

let roundCount = 1;

let showMessages = true;

const crypto = require('crypto');

let eventDelay = 3000; // time in ms

// Importing the required modules
const WebSocketServer = require('ws');

/*
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
*/

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
let isRole = value => {
    for(let role in Role)
    {
        if(role === value)
        {
            return true;
        }
    }
    return false;
}

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

        if (role === Role.PLAYER || role === Role.AI) {

            if (gameStarted) {
                canJoin = false;
                SendError(ws, 4)
            }

            if (canJoin) {
                clients.push(this);
            }

        } else if (role === Role.SPECTATOR) {
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
        if(index !== -1) {
            clients.splice(index, 1);
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
            if(ws.client)
            {
                ws.client.removeClient();
                ws.close();
            }
        }
        if(showMessages)
        {
            console.log(msg);
        }
        
        if(msg.hasOwnProperty("message"))
        {
            switch (msg.message)
            {
                case Message.HELLO_SERVER:

                    if(ws.client)
                    {
                        break;
                    }

                    if(msg.hasOwnProperty("data"))
                    {
                        if(msg.data.hasOwnProperty("name") && msg.data.hasOwnProperty("role"))
                        {
                            if(!gameStarted)
                            {
                                ws.client = new GameClient(ws, msg.data.name, msg.data.role);
                            }
                        }
                    }

                    if(!gameStarted && ws.client && ws.client.addClient(ws))
                    {
                        SendHelloClient(ws,ws.client);
                        SendParticipantsInfo();
                    }
                    else
                    {
                        ws.client = null;
                    }
                    
                    break;
                    
                case Message.PLAYER_READY:

                    if(msg.hasOwnProperty("data") && msg.data.hasOwnProperty("ready"))
                    {
                         if(!gameStarted && isBoolean(msg.data.ready) && ws.client)
                         {
                            if(ws.client.role === Role.PLAYER || ws.client.role === Role.AI)
                            {
                                ws.client.ready = msg.data.ready;
                                SendParticipantsInfo();
                                StartGame();
                             }
                         }

                    }
                    
                    break;
                    
                case Message.CHARACTER_CHOICE:
                
                    if(isString(msg.data.characterChoice))
                    {
                            if(ws.client.offeredCharacters.includes(msg.data.characterChoice))
                            {
                                ws.client.characterSelected = true;
                                ws.client.character = msg.data.characterChoice;
                                CharactersSelected();
                            }
                            else
                            {
                                SendError(ws,7);
                            }
                    }
                
                    break;
                
                case Message.CARD_CHOICE:

                    if(CardSelectionValid(ws.client.offeredCards,msg.data.cards))
                    {
                        ws.client.cardsSelected = true;
                        ws.client.cards = msg.data.cards;
                       CardsSelected();
                    }
                    else
                    {
                        SendError(ws,6);
                    }
                
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
                    ps.data.playerName = ws.client.name;
                    ps.data.paused = false;
                    if(msg.hasOwnProperty("data"))
                    {
                        if(msg.data.hasOwnProperty("pause"))
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

                            if(rt && client.token === rt)
                            {
                                ws.client = client;
                                ws.client.ws = ws;
                                console.log(`\x1b[96m ${ws.client.name}\x1b[0m has reconnected`)
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

        if(ws.client instanceof GameClient && ws.client.role && (ws.client.role === Role.PLAYER || ws.client.role === Role.AI))
        {
            if(!gameStarted && ws.client.ready === false)
            {
                ws.client.removeClient();
                SendParticipantsInfo();
                console.log(`\x1b[96m ${ws.client.name}\x1b[0m was removed from clients`);
                //console.log(GetNamesByRole(Role.PLAYER));
            }
        }
        if(ws.client && isString(ws.client.name))
        {
            console.log(`\x1b[96m ${ws.client.name}\x1b[0m has disconnected`)
        }
        else
        {
            console.log("the client has disconnected");
        }
    });
    // handling client connection error
    ws.onerror = function () {
        console.log("Some Error occurred");
    }
});

console.log("The WebSocket server is running on port 8080");

function CardSelectionValid(cardOffer,cardChoice)
{
    let cards = JSON.parse(JSON.stringify(cardOffer))
    for(let card of cardChoice)
    {
        if(card !== Card.EMPTY)
        {
            let index = cards.indexOf(card);

            if (index !== -1)
            {
                cards.splice(index, 1);
            }
            else
            {
                return false;
            }
        }
    }
    return true;
}

function GetPlayerStates()
{
    let playerStates = []

    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
        if(client.playerState)
        {
            playerStates.push(client.playerState)
        }
    }

    return playerStates;
}

/*
function GetRandomDirection()
{
    let directions = [Direction.NORTH,Direction.EAST,Direction.SOUTH,Direction.WEST];
    let index = getRandomIntInclusive(0,3);
    return directions[index];
}
*/

function GetRandomStartField()
{
    let startFields = JSON.parse(JSON.stringify(boardConfig.startFields));

    shuffleArray(startFields);

    for(let sf of startFields)
    {
        if(!OccupiedByPlayer(sf.position))
        {
            return sf;
        }
    }
    console.log("ERROR ALL START FIELDS ALREADY OCCUPIED");

}

function OccupiedByPlayer(position)
{
    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
        if(client.playerState && JSON.stringify(position) === JSON.stringify(client.playerState.currentPosition))
        {
            return true;
        }
    }
    return false;
}

function SpawnCharacter(ws)
{
    let playerState = {};
    playerState.playerName = ws.client.name
    let randomStartField = GetRandomStartField();
    playerState.currentPosition = randomStartField.position;
    playerState.spawnPosition = randomStartField.position;
    playerState.direction = randomStartField.direction;
    playerState.character = ws.client.character;
    playerState.lives = 1;
    playerState.lembasCount = gameConfig.startLembas;
    playerState.suspended = 0
    playerState.reachedCheckpoints = 0;
    playerState.playedCards = [];
    playerState.turnOrder = -1;


    return playerState;
}

function GetClientsByRole(role)
{
    let clientsWithRole = []
    for(let client of clients)
    {
        if(client.role === role)
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
        if(client.name === name)
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
    console.log(`\x1b[91mError ${errorCode}\x1b[0m`)
}

function GetNamesByRole(role)
{
    let clientNames = []
    for(let client of clients)
    {
        if(client.role === role)
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

function CharactersSelected()
{

    let charactersSelected = true;

    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
            if(!client.characterSelected)
            {
                charactersSelected = false;
                break;
            }
    }

    if(charactersSelected) {

        for (let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
        {
            client.playerState = SpawnCharacter(client.ws);
            client.characterSelected = false;
        }

        SendGameState();

        SendCardOffer();
    }
}

function CardsSelected()
{
    let cardsSelected = true;

    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
        if(!client.cardsSelected)
        {
            cardsSelected = false;
            break;
        }
    }

    if(cardsSelected)
    {
        for(let client of clients)
        {
            client.cardsSelected = false;
        }

        RoundStart();
    }
}

function StartGame()
{
    let allPlayersReady = true;

    let players = GetClientsByRole(Role.PLAYER);

    for(let player of players)
    {
        if(player.ready === false)
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
    console.log(`\x1b[96m ${client.name}\x1b[0m joined the game`);
}

function SendParticipantsInfo()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.PARTICIPANTS_INFO;
        msg.data = {};
        msg.data.players = GetNamesByRole(Role.PLAYER);
        msg.data.spectators = GetNamesByRole(Role.SPECTATOR);
        msg.data.ais = GetNamesByRole(Role.AI)
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

function SendRoundStart()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.ROUND_START;
        msg.data = {};
        msg.data.playerStates = GetPlayerStates();
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendCardEvent(client,card,playerStatesArray)
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.CARD_EVENT;
        msg.data = {};
        msg.data.playerName = client.player;
        msg.data.card = card;
        msg.data.playerStates = playerStatesArray;
        msg.data.boardStates = [boardState, boardState]
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
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
        msg.data.playerStates = GetPlayerStates();
        msg.data.boardState = boardState
        msg.data.currentRound = roundCount;

        json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendCardOffer()
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

    for (let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
        let msg = {};
        msg.message = Message.CARD_OFFER;
        msg.data = {};
        msg.data.cards = [];

        let amount = getRandomIntInclusive(7, 9);

        for (let i = 0; i < amount; i++)
        {
            let cardIndex = getRandomIntInclusive(0, cardTypes.length - 1);
            msg.data.cards.push(cardTypes[cardIndex])
        }

        client.offeredCards = msg.data.cards;

        json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function ApplyCard(client,playerStates, card)
{
    let playerStatesArray = [];

    client.playerState.playedCards.push(card);

    switch (card)
    {
        case Card.MOVE_3:

            MovePlayerForward(client);
            playerStatesArray.push(CopyObject(GetPlayerStates()));

        case Card.MOVE_2:

            MovePlayerForward(client);
            playerStatesArray.push(CopyObject(GetPlayerStates()));

        case Card.MOVE_1:

            MovePlayerForward(client);
            playerStatesArray.push(CopyObject(GetPlayerStates()));

            break;

        case Card.MOVE_BACK:

            MovePlayerBackward(client);
            playerStatesArray.push(CopyObject(GetPlayerStates()));

            break;

        case Card.U_TURN:

            ApplyCardUTurn(client);
            playerStatesArray.push(CopyObject(GetPlayerStates()));

            break;

        case Card.LEFT_TURN:

            ApplyCardLeftTurn(client);
            playerStatesArray.push(CopyObject(GetPlayerStates()));

            break;

        case Card.RIGHT_TURN:

            ApplyCardRightTurn(client);
            playerStatesArray.push(CopyObject(GetPlayerStates()));

            break;

        case Card.AGAIN:

            // TODO store and repeat last move
            playerStatesArray.push(CopyObject(GetPlayerStates()));
            break;

        case Card.LEMBAS:

            playerStatesArray.push(CopyObject(GetPlayerStates()));
            break;

        case Card.EMPTY:

            playerStatesArray.push(CopyObject(GetPlayerStates()));
            break;

        default:

            console.log("Invalid Card in Apply Card");

    }

    return playerStatesArray;

}

function InvertDirection(direction)
{
    return RotateDirection(direction,2);
}

function ApplyCardLeftTurn(client)
{
    client.playerState.direction = RotateDirection(client.playerState.direction,-1)
}

function ApplyCardRightTurn(client)
{
    client.playerState.direction = RotateDirection(client.playerState.direction,1)
}

function ApplyCardUTurn(client)
{
    client.playerState.direction = RotateDirection(client.playerState.direction,2);
}

function RotateDirection(direction,i)
{

    let directions = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];
    let index = directions.indexOf(direction);
    let dl = directions.length;
    return directions[(((index + i) % dl) + dl) % dl];
}

function MovePlayerBackward(client)
{
    MovePlayer(client,InvertDirection(client.playerState.direction));
}

function MovePlayerForward(client)
{
    MovePlayer(client, client.playerState.direction)
}

function MovePlayer(client,direction)
{
    let x = client.playerState.currentPosition[0];
    let y = client.playerState.currentPosition[1];

    let dx = 0;
    let dy = 0;

    switch (direction) {
        case Direction.NORTH:
            dy -= 1;
            break;
        case Direction.EAST:
            dx += 1;
            break;
        case Direction.SOUTH:
            dy += 1;
            break;
        case Direction.WEST:
            dx -= 1;
    }

    client.playerState.currentPosition = [x + dx, y + dy];
}

function RiverMovePlayer()
{

}

let timer;

let eventLoop = 0;

function RoundStart()
{
    for(let client of clients)
    {
        client.playerState.playedCards = [];
    }

    SendRoundStart();

    timer = setTimeout(CardEvent,eventDelay);
}

function CardEvent()
{
    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
        let card = client.cards.shift();
        let playerStatesArray = ApplyCard(client, CopyObject(GetPlayerStates()), card);

        SendCardEvent(client, card, playerStatesArray);

    }

    timer = setTimeout(ShotEvent,eventDelay);
}

function ShotEvent()
{
    SendShotEvent();

    timer = setTimeout(RiverEvent,eventDelay);
}

function RiverEvent()
{
    let playersOnRiverField = [];

    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
        for(let riverField of boardConfig.riverFields)
        {
            if(JSON.stringify(client.playerState.currentPosition) == JSON.stringify((riverField.position)))
            {
                playersOnRiverField.push({"client" : client, "river": riverField});
            }
        }
    }

    for(let playerOnRiverField of playersOnRiverField)
    {
        RiverMovePlayer(playerOnRiverField.client, playerOnRiverField.river.direction);
    }

    SendRiverEvent();

    timer = setTimeout(EagleEvent,eventDelay);
}

function EagleEvent()
{
    let playersOnEagleField = [];

    for(let client of GetClientsByRole(Role.PLAYER).concat(GetClientsByRole(Role.AI)))
    {
        for(let eagleField of boardConfig.eagleFields)
        {
            if(JSON.stringify(client.playerState.currentPosition) === JSON.stringify(eagleField.position))
            {
                playersOnEagleField.push(client);
            }
        }
    }

    for(let client of playersOnEagleField)
    {
        // TODO Randomize Order of Eagle Fields
        for(let eagleField of boardConfig.eagleFields)
        {
            if(!OccupiedByPlayer(eagleField.position))
            {
                client.playerState.currentPosition = CopyObject(eagleField.position);
                break;
            }
        }
        SendEagleEvent(client.name);
    }

    timer = setTimeout(GameState,eventDelay);

}

function GameState()
{
    SendGameState();

    if(roundCount >= gameConfig.maxRounds)
    {
        timer = setTimeout(GameEnd,eventDelay);
    }
    else {
        if(eventLoop < 5)
        {
            timer = setTimeout(CardEvent, eventDelay);
            ++eventLoop;
        }
        else
        {
            eventLoop = 0;
            timer = setTimeout(SendCardOffer, eventDelay);
        }
    }

}

function GameEnd()
{
    SendGameEnd();
}

function SendShotEvent()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.SHOT_EVENT;
        msg.data = {};
        msg.data.shooterName = "Player1";
        msg.data.targetName = "Player2";
        msg.data.playerStates = GetPlayerStates();
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendRiverEvent()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.RIVER_EVENT;
        msg.data = {};
        msg.data.playerName = "Player1";
        msg.data.playerStates = [GetPlayerStates()];
        msg.data.boardStates = [boardState]
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendEagleEvent(playerName)
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.EAGLE_EVENT;
        msg.data = {};
        msg.data.playerName = playerName;
        msg.data.playerStates = GetPlayerStates();
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function SendGameEnd()
{
    for(let client of clients)
    {
        let msg = {};
        msg.message = Message.GAME_END;
        msg.data = {};
        msg.data.playerStates = GetPlayerStates();
        msg.data.winner = "Player1";
        msg.data.additional = [];
        let json = JSON.stringify(msg);
        client.ws.send(json);
    }
}

function CopyObject(object)
{
    return JSON.parse(JSON.stringify(object));
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}

const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function RestartServer()
{
    for(let client of clients)
    {
        client.ws.close();
    }

    clients = [];
    gameStarted = false;
    roundCount = 1;
    oardConfig = JSON.parse(boardConfigData);
}

function ShowClients()
{
    let clientNames = [];

    for(let client of clients)
    {
        clientNames.push(`${client.name} (${client.role})`)
    }

    if(clientNames.length > 0) {
        console.log("list of clients:\n" + clientNames.join("\n"))
    }
    else
    {
        console.log("no clients found");
    }

}

function TestRiver()
{
    let message = `{"message":"RIVER_EVENT","data":{"playerName":"Player1","playerStates":[[{"playerName":"Affe","currentPosition":[5,6],"spawnPosition":[5,8],"direction":"NORTH","character":"GIMLI","lives":1,"lembasCount":1,"suspended":0,"reachedCheckpoints":0,"playedCards":["MOVE_2","EMPTY","EMPTY"],"turnOrder":-1},{"playerName":"Pizza","currentPosition":[4,6],"spawnPosition":[4,8],"direction":"NORTH","character":"MERRY","lives":1,"lembasCount":1,"suspended":0,"reachedCheckpoints":0,"playedCards":["MOVE_2","EMPTY","EMPTY"],"turnOrder":-1}]],"boardStates":[{"lembasFields":[{"position":[0,9],"amount":6},{"position":[9,0],"amount":6}]}]}}`

    for(let client of clients)
    {
        client.ws.send(message);
    }

}

const stdin = process.openStdin();

stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that
    // with toString() and then trim()

    let input = d.toString().trim();

    switch (input)
    {
        case "help":
            console.log("list of commands: \n exit \n logLevel 0 \n logLevel 1 \n restart \n clients");
            break;
        case "logLevel 0":
            {
                showMessages = false;
                console.log("display messages disabled");
            }
            break;
        case "logLevel 1":
        {
            showMessages = true;
            console.log("display messages enabled");
            break;
        }
        case "exit":
            console.log("exit console");
            break;
        case "restart":
            RestartServer();
            console.log("server restarted");
            break;
        case "clients":
            ShowClients()
            break;
        case "testRiver":
            TestRiver()
            break;
        default:
            console.log("command not found");
    }

});