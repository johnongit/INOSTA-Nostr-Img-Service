const AWS = require('aws-sdk');
const https = require('https');
const s3 = new AWS.S3();

// DynamoDB function that write payment hash and current time to DynamoDB table
async function writePaymentHashToDynamoDB(payment_hash, date) {
  console.log("in writePaymentHashToDynamoDB")
  console.log(process.env.DYNAMODB_TABLE)
  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        payment_hash: payment_hash,
        date: date,
      },
    };
    const data = await dynamoDB.put(params).promise();
    console.log('Payment hash written to DynamoDB successfully. ' + data);
    return true;
  } catch (err) {
    console.log('Error writing payment hash to DynamoDB:', err);
    return false;
  }
}


module.exports.getInvoice = async function(event, context, callback) {
  console.log(process.env.LNBITS_API_INVOICE_KEY)
  try {
    console.log("in try")
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
        console.log('in request')
        let data = '';
        res.on('data', d => {
          console.log("in data")
          process.stdout.write(d);
          data += d;
        });
        res.on('end', () => {
          console.log("in end")
          resolve(data)
        })
      });
      req.on('error', error => {
        reject(error);
      });
      const paymentData = {
        out: false,
        amount: 100,
        memo: '100',
        unit: 'sat'
      };

      req.write(JSON.stringify(paymentData));
      req.end();
    });
    console.log("before await")
    const data = await requestPromise;
    const responseData = JSON.parse(data);
    const date = new Date().toISOString();
    console.log("response")
    console.log(responseData);
    // write payment hash to DynamoDB
    const statusWrite = await writePaymentHashToDynamoDB(responseData.payment_hash, date);
    // return responseData to the client
    if (!statusWrite) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: 'Error writing payment hash to DynamoDB'
        }),
      }
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Invoice generated successfully.',
        payment_hash: responseData.payment_hash,
        payment_request: responseData.payment_request,
        date: date
      }),
    }
  }
  catch (err) {
    console.log('Error getting invoice from lnbits:', err);
    console.log(err.syscall)
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
