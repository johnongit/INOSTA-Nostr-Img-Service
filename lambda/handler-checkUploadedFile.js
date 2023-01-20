import AWS from 'aws-sdk';
import parser from 'lambda-multipart-parser';
import imageType from 'image-type';
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



// Return type 

async function getFileType(content) {
    try {
        console.log("in getFileTyp")
        const type = await imageType(content);
        console.log(type)
        if (type) {
          return type
        }
        return false
      } catch (err) {
        console.log('Error getting file type:', err);
        return false;
      }
}

// Check if file is image

async function isImage(content) {
  try {
      console.log("in isImage")
      const type = await imageType(content);
      console.log(type)
      if (type) {
        return true
      }
      return false
  } catch (err) {
    return false;
  }
}



//exports.checkUploadedFile = async function(event, context, callback) {
export const checkUploadedFile = async (event, context, callback) => {
  //console.log(event)
  // get headers
  const headers = event.headers;
  // get body
  const body = event.body;
  const eventParsed = await parser.parse(event);


  
  // check if payment hash and date headers are present
  if (!headers['payment-hash']) {
      logger.error('Missing payment hash header')
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
  const decodedBody = Buffer.from(body, 'base64').toString();
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
  // create filename with long random string and current timestamp
  const filename = Math.random().toString(36).substring(2, 15) + Date.now()  + Math.random().toString(36).substring(2, 15) + '.' + extension


  
  const content = eventParsed.files[0].content
  const payment_hash = headers['payment-hash']
  console.log(payment_hash)
  // Check if payment hash is paid
  const paymentPaid = await CheckIfPaymentPaid(payment_hash)

  if (paymentPaid) {
    console.log("payment paid for payment hash " + payment_hash)
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

      // return success if file is uploaded
      logger.info('File uploaded for payment hash ' + payment_hash)
      return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            message: 'File Uploaded',
            url: 'https://' + process.env.CLOUDFRONT_DOMAIN_NAME + '/' + filename
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