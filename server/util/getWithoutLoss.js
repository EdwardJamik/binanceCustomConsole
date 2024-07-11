function getWithoutLoss (order, user, querySkeleton, prevOrder){
    try {
        console.log(order)
        let ordersId = prevOrder
        const currentSize =  parseFloat(order?.quantity)/parseFloat(order?.currentPrice)
        const cross = order?.withoutLoss?.option?.isPriceType !== 'fixed' ? (parseFloat(order?.withoutLoss?.option?.price) * parseFloat(order?.currentPrice)/100) : parseFloat(order?.withoutLoss?.option?.price)
        const fee = ((parseFloat(currentSize)*parseFloat(order?.leverage))*parseFloat(order?.currentPrice)*parseFloat(order?.withoutLoss?.option?.commission)*2)

        if (!ordersId) {
            ordersId = {};
        }

        if(order?.positionSide === 'SHORT'){

            const withousLossShort = ((
                        (parseFloat(order?.quantity)*parseFloat(order?.leverage))
                        -
                        (parseFloat(cross)+parseFloat(fee))
                    )
                    *
                    parseFloat(order?.currentPrice)
                )
                /
                (parseFloat(order?.quantity)*parseFloat(order?.leverage))

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
                    minDeviation: (parseFloat(withousLossShort) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.currentPrice) / 100)).toFixed(6),
                    maxDeviation: (parseFloat(withousLossShort) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.currentPrice) / 100)).toFixed(6),
                }
            }

        } else{

            const withousLossLong = ((
                        (parseFloat(order?.quantity)*parseFloat(order?.leverage))
                        +
                        (parseFloat(cross)+parseFloat(fee))
                    )
                    *
                    parseFloat(order?.currentPrice)
                )
                /
                (parseFloat(order?.quantity)*parseFloat(order?.leverage))

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
                    minDeviation: (parseFloat(withousLossLong) - (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.currentPrice) / 100)).toFixed(6),
                    maxDeviation: (parseFloat(withousLossLong) + (parseFloat(order?.withoutLoss?.option?.deviation) * parseFloat(order?.currentPrice) / 100)).toFixed(6),
                }
            }
        }
    } catch (e){
        console.error(e)
    }
}

exports.getWithoutLoss = getWithoutLoss