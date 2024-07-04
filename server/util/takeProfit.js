function createTakeProfit (order,querySkeleton, user) {
    if (order?.take_profit?.status) {
        let takeProfitQuery = {...querySkeleton};
        takeProfitQuery.side = order?.positionSide === 'LONG' ? 'SELL' :  'BUY';

        takeProfitQuery.type = `TAKE_PROFIT_MARKET`;
        if (order?.take_profit?.percent) {
            const percentPrice = (order?.take_profit?.currentPrice * order?.take_profit?.stopPrice) / 100;
            if (order?.positionSide === 'LONG') {
                takeProfitQuery.stopPrice = `${(Number(order?.take_profit?.currentPrice) + percentPrice).toFixed(2)}`;
            } else if (order?.positionSide === 'SHORT') {
                takeProfitQuery.stopPrice = `${(order?.take_profit?.currentPrice - percentPrice).toFixed(2)}`;
            }
        } else {

            if (order?.positionSide === 'LONG') {
                takeProfitQuery.stopPrice = `${((parseFloat(order?.take_profit?.stopPrice)/(parseFloat(order?.quantity)/parseFloat(order?.take_profit?.currentPrice)))+parseFloat(order?.take_profit?.currentPrice)).toFixed(2)}`;
            } else if (order?.positionSide === 'SHORT') {
                takeProfitQuery.stopPrice = `${(parseFloat(order?.take_profit?.currentPrice)-(parseFloat(order?.take_profit?.stopPrice)/(parseFloat(order?.quantity)/parseFloat(order?.take_profit?.currentPrice)))).toFixed(2)}`;
            }
        }

        return takeProfitQuery;
    }
}

exports.createTakeProfit = createTakeProfit