const crypto =  require("crypto");

module.exports.getSignature = (queryString, token) => {
    try{
        return crypto
            .createHmac('sha256', token)
            .update(queryString)
            .digest('hex');
    } catch (e){
        console.error(e)
    }
}


module.exports.getHeaders = (token) => {
    try{
        return {
            'X-MBX-APIKEY': `${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        };
    } catch (e){
        console.error(e)
    }
}