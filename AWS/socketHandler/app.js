const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async event => {
 console.log(event)

 switch(event.requestContext.routeKey){
   case '$connect':
     return await ddb.put(connect(event)).promise()
     .then(success("Connected"))
     .catch(error)
   case '$disconnect':
      return await ddb.delete(disconnect(event)).promise()
      .then(success("Disconnected"))
      .catch(error)
   case 'sendmessage':
      return success("Hi!")
   default:

 }


  try {
    await ddb.put(putParams).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
  }

  return { statusCode: 200, body: 'Connected.' };
};



};


const connect = (event)=>({
  TableName: 'witb',
  Item: {
    recordType : "SOCKET",
    identifier : event.requestContext.connectionId
  }
})

const success = (message)=>({
  statusCode: 200, body: message
})

const error = (error)=>({
  statusCode: 200, body: JSON.stringify(error)
})


const disconnect = (event)=>({
  TableName: 'witb',
  Key: {
    recordType : "SOCKET",
    identifier : event.requestContext.connectionId
  }
})