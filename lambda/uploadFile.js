import AWS from 'aws-sdk';
import parser from 'lambda-multipart-parser';
import imageType from 'image-type';
import { createLogger, format, loggers, transports } from 'winston';
import crypto from 'crypto';

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
      return true;
    }
}

// delete entry from dynamoDB if file is uploaded
async function deletePaymentInDb(payment_hash) {
    try {
      logger.debug("in deletePaymentInDb " + payment_hash)
      const dynamoDB = new AWS.DynamoDB.DocumentClient();
      const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          payment_hash: payment_hash
        }
      };
      const data = await dynamoDB.delete(params).promise();
      logger.debug("in deletePaymentInDb " + data)
      // data is empty if delete is successful
      // return true if data is empty
      if (Object.keys(data).length === 0) {
        return true
      }
      return false;
    } catch (err) {
      logger.error('Error deleting presigned url from DynamoDB:', err);
      return false;
    }
}

async function PutFileToS3(content, filename, contentType){
    try {
        const s3 = new AWS.S3();
        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: filename,
            Body: content,
            ContentType: contentType
        };
        const data = await s3.putObject(params).promise();
        if (data) {
          return true
        }
        return false
      } catch (err) {
        logger.error('Error putting file to S3:', err);
        return false;
      }
}



// Check if file is image

async function isImage(content) {
  try {
      const type = await imageType(content);
      if (type) {
        return true
      }
      return false
  } catch (err) {
    return false;
  }
}



export const uploadFile = async (event, context, callback) => {
  let callback_url = process.env.CLOUDFRONT_DOMAIN_NAME
  logger.info(callback_url)
  // if CF_CUSTOM_DOMAIN not empty
  if (process.env.CF_CUSTOM_DOMAIN) {
    callback_url = process.env.CF_CUSTOM_DOMAIN
  }
  logger.info(callback_url)
  // get headers
  const headers = event.headers;
  // get body
  const body = event.body;
  const eventParsed = await parser.parse(event);
  logger.info(event)
  // check if "payment-hash" is in query string
  if (!event.queryStringParameters['payment-hash']) {
      logger.error('Missing payment hash query string')
      return {
          statusCode: 200,
          body: JSON.stringify({
              success: false,
              message: 'Missing payment hash query string'
          })
      };
  }
  const payment_hash = event.queryStringParameters['payment-hash']

  logger.info('Receive file upload request for payment hash: ' + payment_hash)
  // if body is empty
  if (!eventParsed.files) {
      logger.error('Missing body')
      return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            message: 'Missing body'
          })
      }
  }
  // decode body from base64
  //const decodedBody = Buffer.from(body, 'base64').toString();
  // check if content type exists
  if (!eventParsed.files[0].contentType) {
      logger.error('Missing content type')
      return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            message: 'Missing content type'
          })
      }
  }
  // set Content-Type in eventParsed 
  const contentType = eventParsed.files[0].contentType
  
  // separate filename and extension
  const filenameSplit = eventParsed.files[0].filename.split('.')
  const extension = filenameSplit[1]
  // return current year/month/day
  const date = new Date().toISOString().slice(0, 10)
  // hash filename with sha256 from date
  const hash = crypto.createHash('sha256').update(date).digest('hex')

  // create filename with long random string and current timestamp
  const filename = "images/" + hash + "/" + Math.random().toString(36).substring(2, 15) + Date.now()  + Math.random().toString(36).substring(2, 15) + '.' + extension


  
  const content = eventParsed.files[0].content
  // Check if payment hash is paid
  const paymentPaid = await CheckIfPaymentPaid(payment_hash)

  if (paymentPaid) {
    logger.info('Payment is paid for payment hash ' + payment_hash)
      // check if file is image
      const isImageFile = await isImage(content)
      if (!isImageFile) {
        logger.error('File is not an image for payment hash ' + payment_hash)
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            message: 'File is not an image'
          })
        }

      }

      // put file to s3
      const fileUploaded = await PutFileToS3(content, filename, contentType)
      if (!fileUploaded) {
        logger.error('File not uploaded for payment hash ' + payment_hash)
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            message: 'File not uploaded'
          })
        }
      }
      // delete entry from dynamoDB
      const deleted = await deletePaymentInDb(payment_hash)
      if (!deleted) {
        logger.error('Payment hash not deleted from DynamoDB for payment hash ' + payment_hash)
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            message: 'Cannot upload file'
          })
        } 
      }
      // return success if file is uploaded
      logger.info('File uploaded for payment hash ' + payment_hash)
      // if CF_CUSTOM_DOMAIN is set, return url with custom domain
      // ternerary operator


  

      return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            message: 'File Uploaded',
            url: 'https://' + callback_url + '/' + filename
        })
      }
  }
  else {
    logger.error('Payment not paid for payment hash ' + payment_hash)
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: 'Payment not paid'
      })
    }
  }
}