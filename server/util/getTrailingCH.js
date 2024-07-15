function getTrailingCH (order, user, querySkeleton, prevOrder, key_1, key_2, binance_test) {
    try {

        const currentSize =  parseFloat(querySkeleton?.executedQty)/parseFloat(order?.leverage)

        let skeletonTrailing = {
            orderId: querySkeleton?.orderId,
            userId: String(user?._id),
            q: parseFloat(querySkeleton?.executedQty),
            positionSide: querySkeleton?.positionSide,
            symbol: querySkeleton?.symbol,
            price: parseFloat(querySkeleton?.avgPrice),
            deviation: order?.positionSide === 'SHORT' ? parseFloat(querySkeleton?.avgPrice) + (parseFloat(querySkeleton?.avgPrice) * parseFloat(order?.trailing?.option[0]?.deviation) / 100) : parseFloat(querySkeleton?.avgPrice) - (parseFloat(querySkeleton?.avgPrice) * parseFloat(order?.trailing?.option[0]?.deviation) / 100),
            index: 0,
            arrayPrice: [],
            arrayDeviation: [],
            // lastPrice: parseFloat(order?.trailing?.option[order?.trailing?.option?.length - 1]?.price),
            // lastDeviation: parseFloat(order?.trailing?.option[order?.trailing?.option?.length - 1]?.deviation),
            isPriceType: order?.trailing?.option[order?.trailing?.option?.length - 1]?.isPriceType !== 'fixed',
            isDeviationType: true,
            startPrice: parseFloat(querySkeleton?.avgPrice),
            commission: (parseFloat(currentSize)*parseFloat(order?.leverage))*parseFloat(querySkeleton?.avgPrice)*(parseFloat(order?.commission)),
            commissionPrecent: order?.commission,
            key_1, key_2, binance_test
        }

        let i = 0
        for(const orderItem of order?.trailing?.option) {

            if (i === 0) {
                const newDeviation = parseFloat(orderItem?.price) * parseFloat(orderItem?.deviation) / 100

                skeletonTrailing = {
                    ...skeletonTrailing,
                    arrayPrice: [parseFloat(orderItem?.price)],
                    arrayDeviation: [newDeviation],
                }
            } else {
                const newPrice = parseFloat(skeletonTrailing?.arrayPrice[i - 1]) + parseFloat(orderItem?.price)
                const newDeviation = parseFloat(newPrice) - (parseFloat(orderItem?.price) * parseFloat(orderItem?.deviation) / 100)

                skeletonTrailing = {
                    ...skeletonTrailing,
                    arrayPrice: [...skeletonTrailing?.arrayPrice, newPrice],
                    arrayDeviation: [...skeletonTrailing?.arrayDeviation, newDeviation],
                }
            }
            i++
        }

        return {
            ...prevOrder,
            trailing: {...skeletonTrailing}
        }
    } catch (e) {
        console.error(e)
    }

}

exports.getTrailingCH = getTrailingCH