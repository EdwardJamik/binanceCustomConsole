import React from 'react';

const Profit = () => {
    return (
        <div className='profitPanel'>
            <div className="profit textRed">
                <span className='gold'>Profit</span>
                1.000 USDT
                <div className='procent textRed'>-0.5%</div>
            </div>
            <div className=" profit textGreen">
                <span className='gold'>Profit for 7 days</span>
                1.000.000 USDT
                <div className='procent'>120%</div>
            </div>
        </div>
    );
};

export default Profit;