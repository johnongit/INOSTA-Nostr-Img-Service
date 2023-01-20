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


// Check if payment is paid in DynamoDB
async function CheckIfPaymentPaid(payment_hash) {
  try {
    logger.debug("in CheckIfPaymentPaid " + payment_hash)
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
        return true
      }
      return false
    }
    return false;
  } catch (err) {
    logger.error('Error getting payment hash from DynamoDB:', err);
    return false;
  }
} 


// Create a function that delete a presigned url from dynamoDB
async function deletePresignedUrl(payment_hash) {
  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        payment_hash: payment_hash
      },
    };
    const data = await dynamoDB.delete(params).promise();
    if (data.Item) {
      return true
    }
    return false;
  } catch (err) {
    logger.error('Error deleting presigned url from DynamoDB:', err);
    return false;
  }
}
export const getPresignedUrl = async (event, context, callback) => {
  try {
    let body = {}
    // if body is in base64, decode it
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64').toString();
    }
    else {
      body = event.body;
    }
    
    const bodyJson = JSON.parse(body);
    const payment_hash = bodyJson["payment-hash"];
    //const filename = bodyJson.filename;
    const paymentPaid = await CheckIfPaymentPaid(payment_hash)
    logger.info("Receive payment status request for payment hash: " + payment_hash);
    if (paymentPaid) {
      logger.info('Payment paid for payment hash: ' + payment_hash);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Invoice paid'
        })
      }
    }
    logger.info('Payment not yet paid for payment hash: ' + payment_hash);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: 'Invoice not paid'
      })
    }
  } catch (err) {
    logger.error('Cannot check if invoice paid', err);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: 'Cannot check if invoice paid'
      })
    }

  }
};