import React, {useEffect, useState} from 'react';
import {ConfigProvider, InputNumber, Select} from "antd";
import {useDispatch, useSelector} from "react-redux";
import axios from "axios";
import {url} from "../Config.jsx";

const AmountPosition = () => {

    const dispatch = useDispatch();
    const amount = useSelector(state => state.amount)

    const handleAmountChange = (value) => {
        dispatch({type: 'FILTER_AMOUNT', payload: value})
    };



    const selectAfter = (
        <Select
            defaultValue="fixed"
            style={{
                width: 60,
            }}
        >
            <Option default value="fixed">$</Option>
            <Option value="procent">%</Option>
        </Select>
    );
    return (
        <div className="dashboard_item amountPosition">
            <span className='gold'>Amount:</span>
            <ConfigProvider
                theme={{
                    token: {
                        colorTextBase:'#fff',
                        colorBorder:'#0E0E0E',
                        controlOutline:'none',
                        colorBgElevated:'#131313',
                        colorBgContainer: '#0E0E0E',
                        colorPrimary:'rgba(240, 216, 90, 0.2)',
                        colorPrimaryBg:'rgba(240, 216, 90, 0.4)',
                        colorPrimaryHover:'rgba(240, 216, 90, 0.4)',
                        colorFillTertiary:'rgba(240, 216, 90, 0.6)',
                    },

                }}
            >
            <InputNumber
                style={{
                    padding:'6px 6px 6px',
                    textAlign:'center',
                }}
                addonAfter={selectAfter}
                onChange={(value)=>{handleAmountChange(value)}}
                min={5}
                defaultValue={amount}
            />
            </ConfigProvider>
        </div>
    );
};

export default AmountPosition;