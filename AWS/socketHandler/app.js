const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const apigwManagementApi = new AWS.ApiGatewayManagementApi({endpoint: process.env.ENDPOINT});
console.log(`Configured to send from ${process.env.ENDPOINT}`)

exports.handler = async event => {
 console.log(event)

 let route = {}

 if(event && event.requestContext && event.requestContext.routeKey){
   route.key = event.requestContext.routeKey
   route.connection = event.requestContext.connectionId
   route.data = event.body ? JSON.parse(event.body).data : false
 } else if (event && event.Records){
   route.key = 'sendmessage'
   route.data = event.Records[0].dynamodb.Keys.recordType.S
 }

 switch(route.key){
   case '$connect':
     return await ddb.put(connect(route.connection)).promise()
     .then(success("Connected"))
     .catch(error("Connection Error"))
   case '$disconnect':
      return await ddb.delete(disconnect(route.connection)).promise()
      .then(success("Disconnected"))
      .catch(error("Disconnection Error"))
   case 'sendmessage':
      return await ddb.query(connections()).promise()
      .then(sendToConnections(route.data))
      .then(success("Sent to all"))
      .catch(error)
   default:
     return error("Badness out of bounds exception")
 }
};

const sendToConnections = message => async (connections) => {
  let postBag = []
  connections.Items.forEach(({identifier: connectionId})=>{
      postBag.push(
        apigwManagementApi.postToConnection({ConnectionId: connectionId, Data: message }).promise()
        .catch(err=>err.statusCode == 410 ? ddb.delete(disconnect(connectionId)).promise() : err)
      )
  })
  return Promise.all(postBag)
}

const connect = (id)=>({
  TableName: 'witb',
  Item: {
    recordType : "SOCKET",
    identifier : id
  }
})

const success = (message)=>(result)=>{
  console.log(`Success: ${message}, given ${JSON.stringify(result)}`)
  return {statusCode: 200, body: message}
}

const error = (message)=>(error)=>{
  console.log(`Error: ${message}, given ${JSON.stringify(error)}`)
  return {statusCode: 500, body: JSON.stringify(error)}
}

const connections = ()=>({
    TableName : 'witb',
    KeyConditionExpression: "#recordType = :socket",
    ProjectionExpression: "identifier",
    ExpressionAttributeNames:{
        "#recordType": "recordType"
    },
    ExpressionAttributeValues: {
        ":socket": "SOCKET"
    }
})


const disconnect = (id)=>({
  TableName: 'witb',
  Key: {
    recordType : "SOCKET",
    identifier : id
  }
})