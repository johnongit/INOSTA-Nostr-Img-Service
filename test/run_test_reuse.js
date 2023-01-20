import qr from 'qrcode-terminal';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
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

/// Create a script that test API Gateway and Lambda function

// Path: test/run_test.js
// Must be run like this: 
// API_HOSTNAME=xxx.execute-api.eu-west-1.amazonaws.com npm test
// xxx.execute-api.eu-west-1.amazonaws.com is the API Gateway endpoint returned by sls deploy

//create a function that call getInvoice API Gateway
async function getInvoice() {
    try {
        const hostname = process.env.API_HOSTNAME;
        // call /getInvoice endpoint
        const path = '/getInvoice';
        const url = `https://${hostname}${path}`;
        const response = await axios.get(url);
        // http code 200 return true, invoice and payment_hash
        if (response.status == 200) {
            return {
                status: true,
                payment_request: response.data.payment_request,
                payment_hash: response.data.payment_hash
            }
        }
        return {
            status: false,
            payment_request: '',
            payment_hash: ''
        }
    } catch (err) {
        console.log('Cannot fetch /getInvoice', err);
        return {
            status: false,
            payment_request: '',
            payment_hash: ''
        }
    }
}

// check /getSignedUrl
async function getSignedUrl(payment_hash) {
    try {
        const hostname = process.env.API_HOSTNAME;
        // call /getSignedUrl endpoint with payment-hash as payload
        const path = '/getSignedUrl';
        const url = `https://${hostname}${path}`;
        const response = await axios.post(url, {
            "payment-hash": payment_hash
        });
        // if api return status true, then payment is paid
        if (response.data.success) {
            return true
        }  
        return false

    } catch (err) {
        console.log('Cannot fetch /getSignedUrl', err);
        return false
    }
}

// function that send bitcoin.jpg file /checkUploadedFile endpoint
async function uploadFile(payment_hash ) {
    try {
        const file = fs.readFileSync('test/bitcoin.jpg')
        const form = new FormData();
        form.append('file', file, 'bitcoin.jpg');
        const hostname = process.env.API_HOSTNAME;
        // call /checkUploadedFile endpoint
        const path = '/checkUploadedFile';
        const url = `https://${hostname}${path}`;
        const response = await axios.post(url, form,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
                'payment-hash': payment_hash
            }
        });
        // if api return status true, then payment is paid
        const bodyJson = response.data
        if (bodyJson.success) {
            return {
                status: true,
                url: bodyJson.url
            }
        }  
        return {
            status: false,
        }

    }
    catch (err) {
        console.log('Cannot fetch /checkUploadedFile', err);
        return {
            status: false,
        }
    }
}

        
            



// Create main function
async function main() {
    // API_HOSTNAME environment variable not set then fail
    
    logger.info('Run test')
    if (!process.env.API_HOSTNAME) {
        logger.error('API_HOSTNAME environment variable not set')
        return;
    }
    // call getInvoice function
    const invoice = await getInvoice();
    // if getInvoice return true, then call getSignedUrl function
    if (invoice.status) {
        // display payment_request
        // convert payment_request to qr code and display it in shell
        
        qr.generate(invoice.payment_request, {  small: true });
        logger.info('payment_request: ' + invoice.payment_request)
    }
    logger.info('wait for payment')
    // call each 10 second if payment is paid then upload file if payment is paid
    let paymentOk = false
    const interval = await setInterval(async () => {
        logger.info("check payment")
        //console.log('check payment')
        // call getSignedUrl function
        const signedUrl = await getSignedUrl(invoice.payment_hash);
        // if getSignedUrl return true, then stop interval
        if (signedUrl) {
            logger.info('payment is paid')
            paymentOk= true
            clearInterval(interval);
        }
    }, 10000);
    // wait payment confirmation 
    
    while (true) {
        // if payment is paid then upload file stop interval and break loop
        //logger.info("in loop")
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (paymentOk) {
            paymentOk = false
            logger.info("payment is paid try to upload file")
            const uploaded = await uploadFile(invoice.payment_hash);
            if (uploaded.status) {
                logger.info('file is uploaded')
                logger.info('url: ' + uploaded.url)
                
            }
            // try to resend file
            const uploaded_new= await uploadFile(invoice.payment_hash);
            if (uploaded_new.status) {
                logger.info('file is uploaded')
                logger.info('url: ' + uploaded_new.url)
                break;
            }
            else if (uploaded_new.status == false) {
                logger.info('file is not uploaded')
                break;
            }
        }
    }

    
}

main()