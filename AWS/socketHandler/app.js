const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const apigwManagementApi = new AWS.ApiGatewayManagementApi({endpoint: process.env.ENDPOINT});

exports.handler = async event => {
 console.log(event)

 switch(event.requestContext.routeKey){
   case '$connect':
     return await ddb.put(connect(event.requestContext.connectionId)).promise()
     .then(success("Connected"))
     .catch(error)
   case '$disconnect':
      return await ddb.delete(disconnect(event.requestContext.connectionId)).promise()
      .then(success("Disconnected"))
      .catch(error)
   case 'sendmessage':
      return await ddb.query(connections()).promise()
      .then(sendToConnections("Hi"))
      .then(success("Sent to all"))
      .catch(error)  
   default:
     return error("GFY")
 }
};

const sendToConnections = async (message) => async (connections) => {
  let postBag = connections.map((connection)=>{
    await apigwManagementApi.postToConnection({ ConnectionId: connection, Data: message }).promise()
    .catch((err)=>{
      if(err.statusCode == 410) {
        console.log(`Clean up stale connection : ${connection}`)
        await ddb.delete(disconnect(connection)).promise();
      } else throw err
    })
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

const success = (message)=>({
  statusCode: 200, body: message
})

const error = (error)=>({
  statusCode: 200, body: JSON.stringify(error)
})

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