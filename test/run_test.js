const axios = require('axios');
const qr = require('qrcode-terminal');
const fs = require('fs');
const FormData = require('form-data');

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
async function checkUploadedFile(payment_hash ) {
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

        const bodyJson = JSON.parse(JSON.parse(response.data.body).body)
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
    
    console.log('run test')
    if (!process.env.API_HOSTNAME) {
        console.log('API_HOSTNAME environment variable not set');
        return;
    }
    // call getInvoice function
    const invoice = await getInvoice();
    // if getInvoice return true, then call getSignedUrl function
    if (invoice.status) {
        // display payment_request
        // convert payment_request to qr code and display it in shell
        qr.generate(invoice.payment_request, {  small: true });
    }
    console.log("wait for payment")
    // call each 10 second if payment is paid then upload file if payment is paid
    
    const interval = await setInterval(async () => {
        // call getSignedUrl function
        const signedUrl = await getSignedUrl(invoice.payment_hash);
        // if getSignedUrl return true, then stop interval
        if (signedUrl) {
            console.log("payment is paid");
            // send bitcoin.jpg file to api
            // upload bitcoin.jpg file to api
            const uploaded = await checkUploadedFile(invoice.payment_hash);

            if (uploaded.status) {
                console.log("file is uploaded");
                console.log("Fill available at: " + uploaded.url);
                clearInterval(interval);
            }
            

        }
    }, 10000);




    
}

main()