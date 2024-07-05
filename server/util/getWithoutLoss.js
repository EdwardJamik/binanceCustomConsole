function getWithoutLoss (order, user, querySkeleton, prevOrder){
    let ordersId = prevOrder
    const currentSize =  parseFloat(querySkeleton?.executedQty)
    const cross = order?.withoutLoss?.option?.isPriceType !== 'fixed' ? ((parseFloat(querySkeleton?.avgPrice) * parseFloat(order?.withoutLoss?.option?.price))/100) : parseFloat(order?.withoutLoss?.option?.price)
    const fee = ((parseFloat(currentSize)*parseFloat(order?.leverage))*parseFloat(querySkeleton?.avgPrice)*(parseFloat(order?.withoutLoss?.option?.commission)*2))

    if (!ordersId) {
        ordersId = {};
    }

    if (!ordersId['withoutLoss']) {
        ordersId['withoutLoss'] = [];
    }

    if(order?.positionSide === 'SHORT'){

        const withousLossShort = ((
                    (parseFloat(querySkeleton?.cumQuote))
                    -
                    (parseFloat(cross)+parseFloat(fee))
                )
                *
                parseFloat(querySkeleton?.avgPrice)
            )
            /
            (parseFloat(querySkeleton?.cumQuote))

        // ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, orderId, fixed:false, fixedPrice:withousLossShort}}

        return ordersId = {
            ...ordersId,
            ...ordersId, withoutLoss: [
                ...ordersId['withoutLoss'],
                {
                orderId: querySkeleton?.orderId,
                userId: String(user?._id),
                q: querySkeleton?.executedQty,
                positionSide: querySkeleton?.positionSide,
                symbol: querySkeleton?.symbol,
                fix: false,
                fixDeviation:false,
                fixedPrice: (withousLossShort).toFixed(6),
                minDeviation: (parseFloat(withousLossShort) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
                maxDeviation: (parseFloat(withousLossShort) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
            }]
        }

    } else{

        const withousLossLong = ((
                    (parseFloat(querySkeleton?.cumQuote))
                    +
                    (parseFloat(cross)+parseFloat(fee))
                )
                *
                parseFloat(querySkeleton?.avgPrice)
            )
            /
            (parseFloat(querySkeleton?.cumQuote))

        return ordersId = {
            ...ordersId, withoutLoss: [
                ...ordersId['withoutLoss'],
                {
                orderId: querySkeleton?.orderId,
                userId: String(user?._id),
                q: querySkeleton?.executedQty,
                positionSide: querySkeleton?.positionSide,
                symbol: querySkeleton?.symbol,
                fix: false,
                fixDeviation:false,
                fixedPrice: withousLossLong.toFixed(6),
                minDeviation: (parseFloat(withousLossLong) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
                maxDeviation: (parseFloat(withousLossLong) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
            }]
        }
    }
}

exports.getWithoutLoss = getWithoutLoss