## 1- Endpoint definition

# a. Get invoice

Used to get an invoice from the API

*URL*: /getInvoice
*Method*: GET
*Parameters*: None
*Output*: JSON object with the following fields
```
{
    success: true,
    message: 'Invoice generated successfully.',
    payment_hash: <payment_hash> (string),
    payment_request: <invoice> (string)
}
```

*payment_hash* must be saved by the client to be able to check if the invoice has been paid and to upload the file
*payment_request* must be displayed to the user to be able to pay the invoice (can be copied converted to QR code)

*Error*: The API must return a 200 http code (except if it completely crashes)
```
{
    success: false,
    message: <error message>
}
```

**Example:** curl https://*api-endpoint*/getInvoice
    
    ```
    {
        "success": true,
        "message": "Invoice generated successfully.",
        "payment_hash": "3420d22193623050d540982b36e18448ec7586646bef5d293ec11b90223bb348",
        "payment_request": "lnbc1u1p3u833mpp5xssdygvnvgc9p42qnq4ndcvyfrk8tpnyd0h462f7cydeqg3mkdrsdq9xycrqsp59uy0rmde2qe4kcstvgxwugnr2qxgv7pzgwh9jvhcneeaazz2uhzsxqy9gcqcqzys9qrsgqrzjqv5mk8udss3k4uhm2s3urp2dr4ejequpwmq20czjs605rskl68rzwy2ty3x9af75xyqqqqlgqqqq86qq3udg2j83nmgczshtuhy6wt6vu9zrugqugwzwdq7dd0pcneurzkfz68q8jk58khz034j8ele2jwza8meu3ecp73wp2vwzgzdj2exg3zxuqpd5rw93"
    }
    ```

# b. Check payment status

Used to check if an invoice has been paid

*URL*: /checkPayment
*Method*: POST
*Parameters*: JSON object with the following fields *MUST* be sent in the body of the request
```
{
    payment-hash: <payment_hash> (string)
}
```

*Output*: JSON object with the following fields
```
{
    success: true,
    message: 'Invoice paid successfully.'
}
```

*Error*: The API must return a 200 http code (except if it completely crashes)
```
{
    success: false,
    message: <error message>
}
```

**Example:** curl -X POST -H "Content-Type: application/json" -d '{"payment-hash": "3420d22193623050d540982b36e18448ec7586646bef5d293ec11b90223bb348"}' https://*api-endpoint*/checkPayment
    
    ```
    {
        "success": true,
        "message": "Invoice paid successfully."
    }
    ```

# c. Upload file

Used to upload a file to the API

*URL*: /uploadFile
*Method*: POST
*Parameters*: File *MUST* be sent as multipart upload and JSON object with the following fields *MUST* be sent in parameters
```
/uploadFile?payment-hash=<payment-hash> (string)
```
```


*Output*: JSON object with the following fields
```
{
    success: true,
    message: 'File uploaded successfully.'
}
```

*Error*: The API must return a 200 http code (except if it completely crashes)
```
{
    success: false,
    message: <error message>
}
```

**Example:** curl -X POST -H "payment-hash: 3420d22193623050d540982b36e18448ec7586646bef5d293ec11b90223bb348" -F "file=@/path/to/file" https://*api-endpoint*/uploadFile?payment-hash=payment-hash
    
```
{
    "success": true,
    "message": "File uploaded successfully."
}
```


