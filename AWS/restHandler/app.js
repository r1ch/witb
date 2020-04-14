'use strict'
//AWS Setup
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient()

//Dynamo Setup
const {
    DynamoDbSchema,
    DynamoDbTable,
    DataMapper,
    embed
} = require('@aws/dynamodb-data-mapper');
const { v4 } = require('uuid');
const DynamoDB = require('aws-sdk/clients/dynamodb');

const client = new DynamoDB({region: 'eu-west-1'});
const mapper = new DataMapper({client});

//Express Setup
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const app = express()
const router = express.Router()
const asyncHandler = require('express-async-handler')


router.use(cors())
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))
router.use(awsServerlessExpressMiddleware.eventContext())


router.get('/',(req,res) => {
    res.redirect(301,"https://witb.bradi.sh/")
})

router.get('/games', asyncHandler(async (req, res) => {
    let games = []
    for await (const game of mapper.query(Game, {recordType: 'GAME'})) {
        games.push(game)
    }
    res.json(games)
}))

router.get('/games/:game', (req, res) => {
    mapper.get(Object.assign(new Game, {identifier: req.params.game}))
    .then(res.json.bind(res))
    .catch(err => {
        res.status(404).send(`No game found for ID: ${req.params.game}`)
    })
})

router.put('/games/:game/players', (req, res)=>{
    let player = new Player();
    player.identifier = req.body.id
    player.url = req.body.url
    player.name = req.body.name
    player.association = req.params.game;
    mapper.update(player,{onMissing: 'skip'}).then(res.json.bind(res))
})

router.get('/games/:game/players', asyncHandler(async (req, res) => {
    let players = []
    for await (const player of mapper.query(Player, {recordType: 'PLAYER', association: req.params.game}, {indexName: 'index'})) {
        players.push(simple(player))
    }
    res.json(players)
}))

router.get('/games/:game/players/:player/names', asyncHandler(async (req, res) => {
    mapper.get(Object.assign(new Player, {identifier: req.params.player}))
    .then((player)=>{
        console.log(JSON.stringify(player))
        res.json(namesOf(player))
    })
    .catch(err => {
        console.log(err)
        res.status(404).send(`No names found for player with ID: ${req.params.player}, ${err}`)
    })
}))

router.put('/games/:game/players/:player/names', (req, res)=>{
    let player = new Player();
    player.identifier = req.params.player
    player.names = req.body
    mapper.update(player,{onMissing: 'skip'}).then((player)=>{
        res.json(namesOf(player))
    })
})

router.get('/games/:game/names', asyncHandler(async (req, res) => {
    let names = []
    for await (const player of mapper.query(Player, {recordType: 'PLAYER', association: req.params.game}, {indexName: 'index'})) {
        names.push(...namesOf(player))
    }
    res.json(names)
}))

router.put('/players', (req, res)=>{
    let player = new Player();
    player.identifier = req.body.id
    player.url = req.body.url
    player.name = req.body.name
    mapper.update(player,{onMissing: 'skip'}).then(res.json.bind(res))
})

router.get('/players', asyncHandler(async (req, res) => {
    let players = []
    for await (const player of mapper.query(Player, {recordType: 'PLAYER'})) {
        players.push(simple(player))
    }
    res.json(players)
}))

router.post('/games/:game/start', asyncHandler(async (req, res) => {
    let names = []
    let players = []
    for await (const player of mapper.query(Player, {recordType: 'PLAYER', association: req.params.game}, {indexName: 'index'})) {
        names.push(...namesOf(player))
        players.push(player.name)
    }
    let game = new Game()
    game.identifier = req.params.game
    game.names = names
    game.players = players
    mapper.update(game,{onMissing: 'skip'}).then((game)=>{
        res.json(game)
    })
}))


app.use('/', router)

module.exports = app


const simple = (player)=>{
    if (player.names) player.numberOfNames = player.names.length
    else player.numberOfNames = 0
    delete player.names
    return player
}

const namesOf = (player)=>{
    if (player.names) return player.names
    else return []
}

class Game {
    constructor(){
        this.recordType = "GAME";
    }
}

Object.defineProperties(Game.prototype, {
    [DynamoDbTable]: {
        value: 'witb'
    },
    [DynamoDbSchema]: {
        value: {
            recordType: {
                type: 'String',
                keyType: 'HASH',
                defaultProvider: ()=>"GAME",
            },
            identifier: {
	              type: 'String',
                  keyType: 'RANGE',
                  defaultProvider: v4
            },
            title: {type : 'String'},
            rounds: {type: 'List', memberType: {type: 'String'}},
            secondsPerRound: {type: 'Number'},
            namesPerPerson: {type: 'Number'},
            names: {type: 'List', memberType: {type: 'String'}},
            players: {type: 'List', memberType: {type: 'String'}}
        },
    },
});


class Player {
    constructor(){
        this.recordType = "PLAYER"
    }
}

Object.defineProperties(Player.prototype, {
    [DynamoDbTable]: {
        value: 'witb'
    },
    [DynamoDbSchema]: {
        value: {
            recordType: {
                type: 'String',
                keyType: 'HASH',
                defaultProvider: ()=>"PLAYER",
            },
            identifier: {
	              type: 'String',
                  keyType: 'RANGE',
                  defaultProvider: v4   
            },
            name: {type : 'String'},
            url: {type: 'String'},
            association: {type: 'String'},
            names: {
                type: 'List', memberType: {type: 'String'}
            }
        },
    },
});