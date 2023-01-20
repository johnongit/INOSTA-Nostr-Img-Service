import AWS from 'aws-sdk';
import https from 'https';
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

const s3 = new AWS.S3();

// DynamoDB function that write payment hash and current time to DynamoDB table
async function writePaymentHashToDynamoDB(payment_hash, date) {
  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        payment_hash: payment_hash,
        date: date,
        paid: false
      },
    };
    const data = await dynamoDB.put(params).promise();
    logger.info('Payment hash written to DynamoDB successfully ' + payment_hash);
    return true;
  } catch (err) {
    logger.error('Error writing payment hash to DynamoDB:', err);
    return false;
  }
}



export const getInvoice = async (event, context, callback) => {
  console.log(process.env.LNBITS_API_INVOICE_KEY)
  try {
    const options = {
      hostname: process.env.LNBITS_HOST,
      port: 443,
      path: '/api/v1/payments',
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.LNBITS_API_INVOICE_KEY,
        'Content-Type': 'application/json',
      }
    }
    const requestPromise = new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let data = '';
        res.on('data', d => {
          process.stdout.write(d);
          data += d;
        });
        res.on('end', () => {
          resolve(data)
        })
      });
      req.on('error', error => {
        reject(error);
      });
      const paymentData = {
        out: false,
        amount: process.env.PRICE,
        memo: 'Nostr Uploader Invoice',
        unit: 'sat',
        webhook: process.env.WEBHOOW_URL + '/confirmPayment'
      };

      req.write(JSON.stringify(paymentData));
      req.end();
    });
    const data = await requestPromise;
    const responseData = JSON.parse(data);
    const date = new Date().toISOString();
    // write payment hash to DynamoDB
    const statusWrite = await writePaymentHashToDynamoDB(responseData.payment_hash, date);
    // return responseData to the client
    if (!statusWrite) {
      logger.error('Error writing payment hash to DynamoDB');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: 'Error writing payment hash to DynamoDB'
        }),
      }
    }
    logger.info('Invoice generated successfully for payment hash: ' + responseData.payment_hash);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Invoice generated successfully.',
        payment_hash: responseData.payment_hash,
        payment_request: responseData.payment_request
      }),
    }
  }
  catch (err) {
    console.log('Error getting invoice from lnbits:', err);
    logger.error('Error getting invoice from lnbits:', err);
    message = 'General error'
    if (err.syscall == 'getaddrinfo') {
      message = 'Cannot connect to lnbits'
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: message
      }),
    }
  }
};
