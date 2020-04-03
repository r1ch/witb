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
  gamesQuery().then(res.json.bind(res))
})

router.get('/users/:userId', (req, res) => {
  const user = getUser(req.params.userId)

  if (!user) return res.status(404).json({})

})

app.use('/', router)

module.exports = app


//dynamo

const dynamoQuery = (inputModifier, outputModifier)=>new Promise((resolve,reject)=>{
    console.log(`dynamoQuery START`)
    let params = {
        TableName: "witb"
    }
    params = inputModifier(params)
    console.log(`Query ${JSON.stringify(params)}`)
    return dynamo.query(params).promise()
    .then((result)=>resolve(outputModifier(result)))
    .catch(reject)
})


const standardQuery = (key,value)=>(params)=>{
	params.ExpressionAttributeValues = {":key":value},
	params.KeyConditionExpression =  `${key} = :key`
	return params
}

const queryOutput = (output)=>{
  console.log(`queryOutput START`)
  console.log(`queryOutput ${JSON.stringify(output)}`)
  return output.Items
}


const gamesQuery=()=>dynamoQuery(standardQuery("recordType","GAME"),queryOutput)
