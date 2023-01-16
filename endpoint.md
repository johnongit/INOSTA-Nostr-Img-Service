**- GET** - https://5apaevlc4b.execute-api.eu-west-1.amazonaws.com/getInvoice

**Définition**: Permet de récupérer une invoice.

**Utilisation**: doit être appelé par le client pour générer une invoice

**Paramètres**: Sans paramètre

**Nominal** : Retourne un objet JSON avec les informations suivantes
```
{
    success: true,
    message: 'Invoice generated successfully.',
    payment_hash: <payment_hash> (string),
    payment_request: <invoice> (string),
    date: <"date">
}
```

<payment_request> doit être affiché à l'utilisateur pour qu'il puisse payer l'invoice

<payment_hash> doit sauvegardé par le client pour pouvoir vérifier si l'invoice a été payée et pour uploadé le fichier

<"date"> doit être sauvegardé par le client pour pouvoir vérifier si l'invoice a été payée et pour uploadé le fichier

**Exemple:**

> curl https://5apaevlc4b.execute-api.eu-west-1.amazonaws.com/getInvoice

> {"success":true,"message":"Invoice generated successfully.","payment_hash":"3420d22193623050d540982b36e18448ec7586646bef5d293ec11b90223bb348","payment_request":"lnbc1u1p3u833mpp5xssdygvnvgc9p42qnq4ndcvyfrk8tpnyd0h462f7cydeqg3mkdrsdq9xycrqsp59uy0rmde2qe4kcstvgxwugnr2qxgv7pzgwh9jvhcneeaazz2uhzsxqy9gcqcqzys9qrsgqrzjqv5mk8udss3k4uhm2s3urp2dr4ejequpwmq20czjs605rskl68rzwy2ty3x9af75xyqqqqlgqqqq86qq3udg2j83nmgczshtuhy6wt6vu9zrugqugwzwdq7dd0pcneurzkfz68q8jk58khz034j8ele2jwza8meu3ecp73wp2vwzgzdj2exg3zxuqpd5rw93","date":"2023-01-15T09:24:12.654Z"}

**Gestion erreur**: L'api doit retourner un code http 200 (sauf si elle plante complètement)
```
{
    success: false,
    message: <message d'erreur>
}
```
**Remarque**: Le message d'erreur peut être affiché à l'utilisateur

<br/>

**POST - https://5apaevlc4b.execute-api.eu-west-1.amazonaws.com/getSignedUrl**

**Définition**: Permet de vérifier si une invoice a été payée

**Utilisation**: doit être appelé périodiquement (5 secondes ?) par le client après la requête *getInvoice()* pour vérifier si l'invoice a été payée

**Paramètres**: à ajouter en body http
```
{
    payment-hash: <payment_hash> (string)
}
```
<payment_hash> : doit être le même que celui retourné par la requête getInvoice

**Exemple:**

> curl https://5apaevlc4b.execute-api.eu-west-1.amazonaws.com/getSignedUrl --data '{ "payment-hash": "3420d22193623050d540982b36e18448ec7586646bef5d293ec11b90223bb348"}'

> {"success":true}

**Nominal** : Retourne un objet JSON avec les informations suivantes
```
{
    success: true
}
```
**Gestion erreur**: L'api doit retourner un code http 200 (sauf si elle plante complètement)
```
{
    success: false,
    message: <message d'erreur>
}
```
**Remarque**: Le message d'erreur peut être affiché à l'utilisateur

** POST - https://5apaevlc4b.execute-api.eu-west-1.amazonaws.com/checkUploadedFile

**Définition**: Permet d'uploader un fichier

**Utilisation**: doit être appelé par le client pour uploader un fichier

**Paramètres**: A passer en entête en plus avec le fichier uploadé
```
{
    payment-hash: <payment_hash> (string)
}
```
<payment_hash> : doit être le même que celui retourné par la requête getInvoice


**Exemple**
> curl -F 'data=@bitcoin.jpg' https://5apaevlc4b.execute-api.eu-west-1.amazonaws.com/checkUploadedFile -H "payment-hash: 3420d22193623050d540982b36e18448ec7586646bef5d293ec11b90223bb348"

> {"body":"{\"statusCode\":200,\"message\":\"File Uploaded\",\"url\":\"https://d12pgnfs4nv60a.cloudfront.net/5evhgjhp8cx1673774297046ga1cxtb6ene.jpg\"}"}

**Nominal** : Retourne un objet JSON avec les informations suivantes
```
{
    success: true,
    message: 'File uploaded',
    url: <url> (string)
}
```
url : doit être utilisé pour fournir le lien du fichier à l'utilisateur

**Gestion erreur**: L'api doit retourner un code http 200 (sauf si elle plante complètement)
```
{
    success: false,
    message: <message d'erreur>
}
```