//const AWS = require('aws-sdk');
//const https = require('https');
import AWS from 'aws-sdk';

//const s3 = new AWS.S3();

// create a function that read in dynamoDB
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
    return false;
  } catch (err) {
    console.log('Error getting payment hash from DynamoDB:', err);
    return false;
  }
} 


// Create a function that delete a presigned url from dynamoDB
async function deletePresignedUrl(payment_hash) {
  try {
    console.log("in deletePresignedUrl " + payment_hash)
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        payment_hash: payment_hash
      },
    };
    const data = await dynamoDB.delete(params).promise();
    console.log(data)
    if (data.Item) {
      return true
    }
    return false;
  } catch (err) {
    console.log('Error deleting presigned url from DynamoDB:', err);
    return false;
  }
}
export const getPresignedUrl = async (event, context, callback) => {
  try {
    console.log("event ")
    console.log(event)
    console.log(event.body)
    let body = {}
    // if body is in base64, decode it
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64').toString();
    }
    else {
      body = event.body;
    }
    
    console.log("body " + body)
    const bodyJson = JSON.parse(body);
    console.log("bodyJson " + bodyJson)
    const payment_hash = bodyJson["payment-hash"];
    const filename = bodyJson.filename;
    const paymentPaid = await CheckIfPaymentPaid(payment_hash)

    console.log(paymentPaid)
    if (paymentPaid) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Invoice paid'
        })
      }
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: 'Invoice not paid'
      })
    }
  } catch (err) {
    console.log('Cannot check if invoice paid', err);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: 'Cannot check if invoice paid'
      })
    }

  }
};