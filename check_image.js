const AWS = require('aws-sdk');
const sharp = require('sharp');

// Create an S3 client
const s3 = new AWS.S3();

exports.handler = async (event) => {
   // Get details of the uploaded file event
   const bucketName = event.Records[0].s3.bucket.name;
   const fileKey = event.Records[0].s3.object.key;

   // Download the file from S3
   const s3Object = await s3.getObject({ Bucket: bucketName, Key: fileKey }).promise();
   const fileBuffer = s3Object.Body;

   // Check if the file is a valid image
   try {
      await sharp(fileBuffer).metadata();
   } catch (err) {
      // The file is not a valid image, delete the file from S3
      await s3.deleteObject({ Bucket: bucketName, Key: fileKey }).promise();
      return;
   }

   // The file is a valid image, continue with image processing...
};
