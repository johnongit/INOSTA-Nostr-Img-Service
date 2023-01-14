**- GET** - https://jxneerobx6.execute-api.eu-west-1.amazonaws.com/getInvoice
**Définition**: Permet de récupérer une invoice.
**Utilisation**: doit être appelé par le client pour générer une invoice
**Paramètres**: Sans paramètre
**Nominal** : Retourne un objet JSON avec les informations suivantes
{
    success: true,
    message: 'Invoice generated successfully.',
    payment_hash: <payment_hash> (string),
    payment_request: <invoice> (string),
    date: <date>
}
<payment_request> doit être affiché à l'utilisateur pour qu'il puisse payer l'invoice
**Gestion erreur**: L'api doit retourner un code http 200 (sauf si elle plante complètement)
{
    success: false,
    message: <message d'erreur>
}
**Remarque**: Le message d'erreur peut être affiché à l'utilisateur

**POST - https://ybjn8u8hf5.execute-api.eu-west-1.amazonaws.com/getSignedUrl**
**Définition**: Permet de vérifier si une invoice a été payée
**Utilisation**: doit être appelé périodiquement par le client après la requête getInvoice pour:
1. Vérifier si l'invoice a été payée
**Paramètres**: 
{
    payment_hash: <payment_hash> (string),
    date: "date" (string)
}
<payment_hash> : doit être le même que celui retourné par la requête getInvoice
<date> : doit être le même que celui retourné par la requête getInvoice
**Nominal** : Retourne un objet JSON avec les informations suivantes
{
    success: true
}

**Gestion erreur**: L'api doit retourner un code http 200 (sauf si elle plante complètement)
{
    success: false,
    message: <message d'erreur>
}
**Remarque**: Le message d'erreur peut être affiché à l'utilisateur

** POST - https://jxneerobx6.execute-api.eu-west-1.amazonaws.com/checkUploadedFile
**Définition**: Permet d'uploader un fichier
**Utilisation**: doit être appelé par le client pour uploader un fichier
**Paramètres**: A passer en plus avec le fichier uploadé
{
    payment_hash: <payment_hash> (string),
    date: "date" (string)
}
<payment_hash> : doit être le même que celui retourné par la requête getInvoice
<date> : doit être le même que celui retourné par la requête getInvoice
**Nominal** : Retourne un objet JSON avec les informations suivantes
{
    success: true,
    message: 'File uploaded',
    url: <url> (string)
}
<url> : doit être utilisé pour fournir le lien du fichier à l'utilisateur
**Gestion erreur**: L'api doit retourner un code http 200 (sauf si elle plante complètement)
{
    success: false,
    message: <message d'erreur>
}