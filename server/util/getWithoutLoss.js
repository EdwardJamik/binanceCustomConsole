function getWithoutLoss (order, user, querySkeleton, prevOrder){
    try {
        let ordersId = prevOrder
        const currentSize =  parseFloat(querySkeleton?.executedQty)
        const cross = order?.withoutLoss?.option?.isPriceType !== 'fixed' ? ((parseFloat(querySkeleton?.avgPrice) * parseFloat(order?.withoutLoss?.option?.price))/100) : parseFloat(order?.withoutLoss?.option?.price)
        const fee = ((parseFloat(currentSize)*parseFloat(order?.leverage))*parseFloat(querySkeleton?.avgPrice)*(parseFloat(order?.withoutLoss?.option?.commission)*2))

        if (!ordersId) {
            ordersId = {};
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

            return {
                ...prevOrder,
                withoutLoss: {
                    orderId: querySkeleton?.orderId,
                    userId: String(user?._id),
                    q: querySkeleton?.cumQuote,
                    positionSide: querySkeleton?.positionSide,
                    symbol: querySkeleton?.symbol,
                    fix: false,
                    fixDeviation:false,
                    fixedPrice: (withousLossShort).toFixed(6),
                    minDeviation: (parseFloat(withousLossShort) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
                    maxDeviation: (parseFloat(withousLossShort) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
                }
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

            return {
                ...prevOrder,
                withoutLoss: {
                    orderId: querySkeleton?.orderId,
                    userId: String(user?._id),
                    q: querySkeleton?.cumQuote,
                    positionSide: querySkeleton?.positionSide,
                    symbol: querySkeleton?.symbol,
                    fix: false,
                    fixDeviation:false,
                    fixedPrice: withousLossLong.toFixed(6),
                    minDeviation: (parseFloat(withousLossLong) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
                    maxDeviation: (parseFloat(withousLossLong) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(querySkeleton?.avgPrice) / 100)).toFixed(6),
                }
            }
        }
    } catch (e){
        console.error(e)
    }
}

exports.getWithoutLoss = getWithoutLoss