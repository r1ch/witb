const AWS = require('aws-sdk');

exports.handler = async event => {
 console.log(event)

  return { statusCode: 200, body: 'Connected.' };
};