'use strict'
//AWS Setup
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient()



//Express Setup
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const app = express()
const router = express.Router()

router.use(cors())
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))
router.use(awsServerlessExpressMiddleware.eventContext())

router.get('/',(req,res) => {
 res.redirect(301,"https://witb.bradi.sh/")
})

router.get('/games', (req, res) => {
  getGames()
  .then(res.json.bind(res))
})

router.get('/games/:game/players', (req, res) => {
  getPlayersInGame(req.params.game)
  .then(res.json.bind(res))
})

router.put('/games/:game/players', (req, res)=>{
  putPlayerInGame(req.body,req.params.game)
  .then(res.json.bind(res))
})

router.put('/games/:game/players/:player/names', (req, res)=>{
  putNamesForPlayerInGame(req.body,req.params.player,req.params.game)
  .then(res.json.bind(res))
})


app.use('/', router)

module.exports = app


//dynamo


const DB = (index)=>(funct, inputModifier, outputModifier)=>new Promise((resolve,reject)=>{
    console.log(`DB ${funct}`)
    let params = {
        TableName: "witb"
    }
    if(index) params.IndexName="index"
    return dynamo[funct](inputModifier(params)).promise()
    .then((result)=>{
	console.log(`DB ${funct} ${JSON.stringify(result)}`)
	resolve(outputModifier(result))
     })
    .catch(reject)
})


const hashQuery = (hash)=>(params)=>{
	console.log(`hashQuery ${JSON.stringify(hash)}`)
	params.ExpressionAttributeValues = {":key":hash.value},
	params.KeyConditionExpression =  `${hash.key} = :key`
	console.log(`hashQuery ${JSON.stringify(params)}`)
	return params
}

const hashBeginsQuery = (hash,sort)=>(params)=>{
	console.log(`hashBeginsQuery ${JSON.stringify(hash)}, ${JSON.stringify(sort)}`)
	params.ExpressionAttributeValues = {":hash":hash.value, ":sort":sort.value},
	params.KeyConditionExpression =  `${hash.key} = :hash AND begins_with(${sort.key}, :sort)`
	console.log(`hashQuery ${JSON.stringify(params)}`)
	return params
}

const listAppendUpdate = (hash,sort,list,item)=>(params)=>{
	console.log(`listAppendUpdate ${JSON.stringify(hash)}, ${JSON.stringify(sort)}, ${JSON.stringify(item)}`)
	params.Key = {[`${hash.key}`]: hash.value, [`${sort.key}`]: sort.value}
	params.UpdateExpression = "add #list :item"
	params.ExpressionAttributeNames = {"#list": list}
	params.ExpressionAttributeValues = {":item": dynamo.createSet([item])}
	params.ReturnValues = "ALL_NEW"
	console.log(`listAppendUpdate ${JSON.stringify(params)}`)
	return params 
}

const standardUpdate = (hash,sort,item)=>(params)=>{
	console.log(`standardUpdate ${JSON.stringify(hash)}, ${JSON.stringify(sort)}, ${JSON.stringify(item)}`)
	params.Key = {[`${hash.key}`]: hash.value, [`${sort.key}`]: sort.value}
	params.UpdateExpression =  "set details = :details"
	params.ExpressionAttributeValues = {
		":details":item,
	},
	params.ReturnValues = "ALL_NEW"
	console.log(`standardUpdate ${JSON.stringify(params)}`)
	return params
}

const queryOutput = (output)=>{
  console.log(`queryOutput ${JSON.stringify(output)}`)
  return output.Items.map(item=>{
	item.details.recordType = item.recordType
	item.details.recordId = item.identifier
	return item.details
  })
}

const updateOutput = (output)=>{
  console.log(`updateOutput ${JSON.stringify(output)}`)
  output.Attributes.details.recordType = output.Attributes.recordType
  output.Attributes.details.recordId = output.Attributes.identifier
  return output.Attributes.details
}


const t = (key,value)=>({key:key,value:value})


const getGames=()=>DB()(
			"query",
			hashQuery(t("recordType","GAME")),
			queryOutput
			)

const getPlayersInGame=(game)=>DB()(
			"query",
			hashBeginsQuery(t("recordType","PLAYER"),t("identifier",game)),
			queryOutput
			)

/*const putPlayerInGame=(player,game)=>DB()(
			"update",
			standardUpdate(t("recordType","PLAYER"),t("identifier",`${game}:${player.id}`),player),
			updateOutput
			)*/

const putPlayerInGame=(player,game)=>DB()(
			"update",
			listAppendUpdate(t("recordType","GAME"),t("identifier",game),"details.players",player.id),
			updateOutput
			)


const putNamesForPlayerInGame=(names,player,game)=>DB()(
			"update",
			standardUpdate(t("recordType","NAMES"),t("identifier",`${game}:${player}`),names),
			updateOutput
			)
