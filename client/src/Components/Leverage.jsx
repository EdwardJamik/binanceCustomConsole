import React, {useState} from 'react';
import {useSelector} from "react-redux";
import {InputNumber} from "antd";

const Leverage = () => {
    // const [priceUpdates, setPriceUpdates] = useState({price:0, position:true});

    const leverage = useSelector(state => state.currentOption.adjustLeverage)

    const onChange = (value) => {
        console.log('changed', value);
    };

    const calculateWidth = () => {
        const maxSize = 200;
        const minSize = 26;
        const newValueLength = leverage.length;
        const newSize = minSize + ((maxSize - minSize) * newValueLength) / maxSize;
        return newSize;
    };

    return (
        <div className="dashboard_item leverage">
            <span className='gold'>Adjust Leverage:</span>

            <InputNumber
                // prefix="x"
                className='inputLeverage'
                min={1}
                max={120}
                defaultValue={leverage}
                onChange={onChange}
                changeOnWheel
                style={{ width: `${calculateWidth()}px` }}
                // style={{color:'#fff'}}
            />
        </div>
    );
};

export default Leverage;