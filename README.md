# Purpose

INOSTA (**I**mage and **N**ot **O**ther **S**tuff **T**ransmitted by **A**PIs) is a paid image hosting service that allows Nostr users to upload images and share them with others. Payment is done via Lightning Network.

The service is a simple API that allows users to upload images and check if they have been paid. The API is a set of serverless AWS services (API gateway, Lambda functions, DynamoDB table and S3 bucket) that are deployed using the serverless framework. LNbits is used as payment processor to create invoices and check if they have been paid.


Images are hosted on aws S3 and distributed via cloudfront.


## Architecture overview

![Diagram](/Docs/diagram.png)

# Installation

## Prerequisites

- AWS account
- AWS CLI (https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- Serverless framework (npm install -g serverless)
- Node.js
- Domain name 
- SSL certificate provided by AWS Certificate Manager (used by cloudfront)

## know limitations

API gateway cannot handle large files (more than 10MB). Image must be resized before being uploaded to the service (around 5MB)

Serverless framework cannot attach custom domain to API gateway. You need to do it manually after the first deployment.

## Deployment

In order to deploy the application, you need to run the following command:

```
git clone 
cd inosta-paid-image-hosting
```

Copy and edit the variables in the .env file

```
cp variables.sample.yml variables.yml
```

**Variables:**

* LNBITS_HOST: LNbits host
* LNBITS_API_INVOICE_KEY: LNbits invoice api key (not admin key)
* S3_BUCKET: S3 bucket name created after the fist cloudfront distribution deployment
* CLOUDFRONT_DOMAIN: Cloudfront domain name created after the fist cloudfront distribution deployment
* ALLOWED_IP: Public IP address of the lnbits server
* Price: Service price in satoshis
* CF_CUSTOM_DOMAIN: You custom domain name (attached to the cloudfront distribution)
* CF_CUSTOM_DOMAIN_CERTIFICATE_ARN: The ARN of the certificate provided by AWS Certificate Manager (used by cloudfront).
> **Note:** The certificate must be in the us-east-1 and must be **deployed before** the cloudfront distribution.


### Deploy the cloudfront distribution

This will create a cloudfront distribution and a S3 bucket. Copy the S3 bucket name and the cloudfront domain name and paste them in the variables.yml file.

```
$ sls deploy --config serverless-cloudfront.yml
```
> **Note:** The first deployment will take a while (around 20 minutes) because it will create the S3 bucket and the cloudfront distribution.

> **Note2:** Don't forget to point your DNS (CNAME) to the cloudfront domain name.

### Deploy serverless backend

This command wil deploy an API gateway with four endpoints ([api definition](/Docs/endpoint.md)), four lambda functions and a dynamoDB table (used to store payment hashes).
The command will return API endpoints fqdn and each API entry points.

```
$ sls deploy
```


## Test

You can test the service by running test script stored in the test folder.

```
$ cd test
$ API_HOSTNAME=<api-gw-fqdn> node run_test.js
```

## Usage

As long the service is just a set of API endpoints, you can use it with any programming language. The API definitions are stored in the [endpoint.md](/Docs/endpoint.md) file.

