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




export const checkPayment = async (event, context, callback) => {
  try {
    const srcIp = event.requestContext.http.sourceIp
    const body = JSON.parse(event.body)
    const payment_hash = body.payment_hash
    logger.info("Webhook received from " + srcIp + " with payment_hash " + payment_hash)
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
    const paymentPaid = await CheckIfPaymentPaid(payment_hash)
    logger.info("paymentPaid (false is exist and not yet paid)" + paymentPaid)
    if (!paymentPaid) {
      // update dynamoDB and mark the invoice as paid
      logger.debug("Payment not paid, updating payment hash in DynamoDB " + payment_hash)
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
        logger.error('Error updating payment hash in DynamoDB')
        callback(null, {
          statusCode: 500,
          body: JSON.stringify({
            message: 'Cannot update DB'
          }),
        });
      }
  
    }
    
    // payment hash not in dynamoDB
    logger.info("Payment hash not in dynamoDB" + payment_hash)
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Payment Hash not exist in dynamoDB'
      }),
    });
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