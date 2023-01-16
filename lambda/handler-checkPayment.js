const AWS = require('aws-sdk');
const https = require('https');
const s3 = new AWS.S3();

// create a function that read in dynamoDB and return if presigned url exists

async function CheckIfPaymentPaid(payment_hash) {
  try {
    console.log("in CheckIfPaymentPaid " + payment_hash)
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        payment_hash: payment_hash
      },
    };
    const data = await dynamoDB.get(params).promise();
    console.log(data)
    if (data.Item) {
      if(data.Item.paid) {
        return true
      }
      return false
    }
    return true;
  } catch (err) {
    console.log('Error getting payment hash from DynamoDB:', err);
    return true;
  }
} 

// Update dynamoDB and mark the invoice as paid
async function updatePaymentHash(payment_hash) {
  try {
    console.log("in updatePaymentHash " + payment_hash)
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        payment_hash: payment_hash
      },
      UpdateExpression: "set paid = :p",
      ExpressionAttributeValues:{
        ":p":true
      },
      ReturnValues:"UPDATED_NEW"
    };  
    const data = await dynamoDB.update(params).promise();
    console.log(data)
    console.log(typeof data)
    console.log(data.Attributes.paid)
    if (data.Attributes.paid) {
      return true
    }
    return false;
  } catch (err) {
    console.log('Error updating payment hash in DynamoDB:', err);
    return false;
  }
}



module.exports.checkPayment = async function(event, context, callback) {

  try {
    console.log(event)
    console.log("event " + event)
    const srcIp = event.requestContext.http.sourceIp
    const body = JSON.parse(event.body)
    const payment_hash = body.payment_hash
    console.log("payment_hash " + payment_hash)
    if (srcIp != process.env.ALLOWED_IP) {
      // log error
      console.log(srcIp + ' no allowed to access this endpoint')
      callback(null, {
        statusCode: 403,
        body: JSON.stringify({
          message: 'Forbidden'
        }),
      });
    }
    // check if payment_hash is in dynamoDB and not marked as paid
    const paymentPaid = await CheckIfPaymentPaid(payment_hash)
    if (!paymentPaid) {
      // update dynamoDB and mark the invoice as paid
      const updatePaymentHashResult = await updatePaymentHash(payment_hash)
      if (updatePaymentHashResult) {
        callback(null, {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Payment Paid'
          }),
        });
      } else {
        // log error
        console.log('Error updating payment hash in DynamoDB')
        callback(null, {
          statusCode: 500,
          body: JSON.stringify({
            message: 'Error updating payment hash in DynamoDB'
          }),
        });
      }
  
    }
    
    // payment hash not in dynamoDB
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Payment Hash not exist in dynamoDB'
      }),
    });
  } catch (err) {
    console.log('Cannot run lambda ', err);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Error getting payment hash from DynamoDB'
      }),
    });
  }
};