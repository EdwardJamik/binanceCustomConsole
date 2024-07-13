function getWithoutLoss (order, user, querySkeleton, prevOrder){
    try {
        console.log('WITHOUTLOSS ->>>>>>>>>>>>>> ',order,querySkeleton)
        const currentSize =  parseFloat(querySkeleton?.executedQty)/parseFloat(order?.leverage)

        if(order?.positionSide === 'SHORT'){

            return {
                ...prevOrder,
                withoutLoss: {
                    orderId: querySkeleton?.orderId,
                    userId: String(user?._id),
                    q: parseFloat(querySkeleton?.executedQty),
                    positionSide: querySkeleton?.positionSide,
                    symbol: querySkeleton?.symbol,
                    fix: false,
                    fixDeviation:false,
                    fixedPrice: parseFloat(order?.withoutLoss?.option?.price),
                    minDeviation: parseFloat(order?.withoutLoss?.option?.price) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.withoutLoss?.option?.price) / 100),
                    maxDeviation: parseFloat(order?.withoutLoss?.option?.price) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.withoutLoss?.option?.price) / 100),
                    startPrice: querySkeleton?.avgPrice,
                    commission: (parseFloat(currentSize)*parseFloat(order?.leverage))*parseFloat(querySkeleton?.avgPrice)*(parseFloat(order?.withoutLoss?.option?.commission)),
                    commissionPrecent: order?.commission
                }
            }

        } else{

            return {
                ...prevOrder,
                withoutLoss: {
                    orderId: querySkeleton?.orderId,
                    userId: String(user?._id),
                    q: parseFloat(querySkeleton?.executedQty),
                    positionSide: querySkeleton?.positionSide,
                    symbol: querySkeleton?.symbol,
                    fix: false,
                    fixDeviation: false,
                    fixedPrice: parseFloat(order?.withoutLoss?.option?.price),
                    minDeviation: (parseFloat(order?.withoutLoss?.option?.price) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.withoutLoss?.option?.price) / 100)).toFixed(6),
                    maxDeviation: (parseFloat(order?.withoutLoss?.option?.price) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.withoutLoss?.option?.price) / 100)).toFixed(6),
                    startPrice: parseFloat(querySkeleton?.avgPrice),
                    commission: (parseFloat(currentSize)*parseFloat(order?.leverage))*parseFloat(querySkeleton?.avgPrice)*(parseFloat(order?.withoutLoss?.option?.commission)),
                    commissionPrecent: order?.commission
                }
            }
        }
    } catch (e){
        console.error(e)
    }
}

exports.getWithoutLoss = getWithoutLoss