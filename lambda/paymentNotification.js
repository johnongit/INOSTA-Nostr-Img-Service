import AWS from 'aws-sdk';
import { createLogger, format, loggers, transports } from 'winston';

const logger = createLogger({
    level: 'info',
    transports: [
        new transports.Console()
    ],
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
});



// create a function that read in dynamoDB and return if presigned url exists

async function CheckIfPaymentPaid(payment_hash) {
  try {
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
      // return true if payment_hash is in dynamoDB and marked as paid
      if(data.Item.paid) {
        return true
      }
      // return false if payment_hash is in dynamoDB and not marked as paid
      return false
    }
    return true;
  } catch (err) {
    console.log('Error getting payment hash from DynamoDB:', err);
    return true;
  }
} 

// Check if payment exist and marked as paid in DynamoDB
async function CheckIfPaymentExistAndPaid(payment_hash) {
  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        payment_hash: payment_hash
      },
    };
    const data = await dynamoDB.get(params).promise();
    if (data.Item) { 
      if(data.Item.paid) {
        return {
          "exist": true,
          "paid": true
        }
      }

      return {
        "exist": true,
        "paid": false
      }
    }
    return {
      "exist": false,
      "paid": false
    }
  } catch (err) {
    logger.error('Error getting payment hash from DynamoDB:', err);
    return {
      "exist": false,
      "paid": false
    }
  }
}


// Update dynamoDB and mark the invoice as paid
async function updatePaymentHash(payment_hash) {
  try {
    logger.info("in updatePaymentHash " + payment_hash)
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
    if (data.Attributes.paid) {
      return true
    }
    return false;
  } catch (err) {
    logger.error('Error updating payment hash in DynamoDB:', err);
    return false;
  }
}



// webhook handler that receive payment_hash from lnbits and mark payment as paid in dynamoDB
export const paymentNotification = async (event, context, callback) => {
  try {
    const srcIp = event.requestContext.http.sourceIp
    const body = JSON.parse(event.body)
    // if payment_hash not exist in body. prompt specific error
    if (!body.payment_hash) {
      logger.error("Webhook received from " + srcIp + " without payment_hash")
      callback(null, {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Forbidden'
        }),
      });
    }
    const payment_hash = body.payment_hash
    logger.info("Webhook received from " + srcIp + " with payment_hash " + payment_hash)
    // check if source IP is allowed
    if (srcIp != process.env.ALLOWED_IP) {
      logger.warning(srcIp + ' no allowed to access this endpoint')
      callback(null, {
        statusCode: 403,
        body: JSON.stringify({
          message: 'Forbidden'
        }),
      });
    }
    // check if payment_hash is in dynamoDB and not marked as paid
    // Return true if payment_hash is in dynamoDB (or not :()) and marked as paid
    // should refactored :(
    //const paymentPaid = await CheckIfPaymentPaid(payment_hash)
    const paymentExist = await CheckIfPaymentExistAndPaid(payment_hash)
    // if payment not exist return to used
    if (!paymentExist.exist) {
      logger.info("Payment hash not exist in dynamoDB " + payment_hash)
      callback(null, {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Payment Hash not exist + ' + payment_hash
        }),
      });
    }
    // if payment exist and not paid
    if (paymentExist.exist && !paymentExist.paid) {
      logger.info("Payment hash exist in dynamoDB and not paid" + payment_hash)
      try {
        const updatePaymentHashResult = await updatePaymentHash(payment_hash)
        if (updatePaymentHashResult) {
          logger.info("Payment marked as paid in dynamoDB " + payment_hash)
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Payment marked as paid'
            }),
          }
        }
        logger.error("Payment not marked as paid in dynamoDB " + payment_hash)
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Payment not marked as paid'
          }),
         }
        }
        catch (err) {
          logger.error('Error updating payment hash in DynamoDB ' + err)
          callback(null, {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Error updating payment hash in DynamoDB'
            }),
          });
        }
      }



  } catch (err) {
    logger.error('Cannot run lambda ', err);
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({

        message: 'Error getting payment hash from DynamoDB'
      }),
    });
  }
};