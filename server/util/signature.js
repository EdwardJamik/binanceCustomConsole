const crypto =  require("crypto");

module.exports.getSignature = (queryString, token) => {
    return crypto
        .createHmac('sha256', token)
        .update(queryString)
        .digest('hex');
}


module.exports.getHeaders = (token) => {
    return {
        'X-MBX-APIKEY': `${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
}