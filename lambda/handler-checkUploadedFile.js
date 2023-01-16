const AWS = require('aws-sdk');
const parser = require('lambda-multipart-parser');


async function CheckIfPaymentPaid(payment_hash) {
    try {
      console.log("in CheckIfPaymentPaid " + payment_hash)
      console.log(process.env.DYNAMODB_TABLE)
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
      return true;
    }
}

async function PutFileToS3(content, filename, contentType){
    try {
        console.log("in PutFileToS3")
        console.log(process.env.S3_BUCKET)
        const s3 = new AWS.S3();
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: filename,
            Body: content,
            ContentType: contentType
        };
        const data = await s3.putObject(params).promise();
        console.log(data)
        if (data) {
          return true
        }
        return false
      } catch (err) {
        console.log('Error putting file to s3:', err);
        return false;
      }
}

// Grab 
exports.checkUploadedFile = async function(event, context, callback) {
  //console.log(event)
  // get headers
  const headers = event.headers;
  // get body
  const body = event.body;
  const eventParsed = await parser.parse(event);
  console.log(headers)
  console.log(body)
  console.log(headers['payment-hash'])
  console.log(eventParsed)

  
  // check if payment hash and date headers are present
  if (!headers['payment-hash']) {
      return {
          statusCode: 200,
          body: JSON.stringify({
              success: false,
              message: 'Missing payment hash header'
          })
      };
  }
  // if body is empty
  if (!eventParsed.files) {
      return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            message: 'Missing body'
          })
      }
  }
  // decode body from base64
  const decodedBody = Buffer.from(body, 'base64').toString();
  // set Content-Type in eventParsed 
  const contentType = eventParsed.files[0].contentType
  
  // separate filename and extension
  const filenameSplit = eventParsed.files[0].filename.split('.')
  const extension = filenameSplit[1]
  // create filename with long random string and current timestamp
  const filename = Math.random().toString(36).substring(2, 15) + Date.now()  + Math.random().toString(36).substring(2, 15) + '.' + extension


  
  const content = eventParsed.files[0].content
  const payment_hash = headers['payment-hash']
  console.log(payment_hash)
  // Check if payment hash is paid
  const paymentPaid = await CheckIfPaymentPaid(payment_hash)

  console.log(paymentPaid)
  if (paymentPaid) {
      // put file to s3
      const fileUploaded = await PutFileToS3(content, filename, contentType)
      return {
        body: JSON.stringify({
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'File Uploaded',
            url: 'https://' + process.env.CLOUDFRONT_DOMAIN_NAME + '/' + filename
          })
        })
      }
  }
  else {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: 'Payment not paid'
      })
    }
  }
}