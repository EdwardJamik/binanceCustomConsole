import React, {useEffect, useRef, useState} from 'react';
import {Button, ConfigProvider, Divider, Input, Select, Space} from "antd";
import {LoadingOutlined, PlusOutlined} from "@ant-design/icons";
import {useSelector} from "react-redux";
import {useSocket} from "../Socket/Socket.jsx";

const settingIcon = [<svg viewBox="0 0 24 24" width='26px' height='26px' fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd"
          d="M14.1395 12.0002C14.1395 13.1048 13.2664 14.0002 12.1895 14.0002C11.1125 14.0002 10.2395 13.1048 10.2395 12.0002C10.2395 10.8957 11.1125 10.0002 12.1895 10.0002C13.2664 10.0002 14.1395 10.8957 14.1395 12.0002Z"
          stroke="#655d30" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    <path fillRule="evenodd" clipRule="evenodd"
          d="M7.57381 18.1003L5.12169 12.8133C4.79277 12.2907 4.79277 11.6189 5.12169 11.0963L7.55821 5.89229C7.93118 5.32445 8.55898 4.98876 9.22644 5.00029H12.1895H15.1525C15.8199 4.98876 16.4477 5.32445 16.8207 5.89229L19.2524 11.0923C19.5813 11.6149 19.5813 12.2867 19.2524 12.8093L16.8051 18.1003C16.4324 18.674 15.8002 19.0133 15.1281 19.0003H9.24984C8.5781 19.013 7.94636 18.6737 7.57381 18.1003Z"
          stroke="#655d30" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
</svg>
]

const PreSetting = () => {
    const [items, setItems] = useState(['custom']);
    const [name, setName] = useState('');
    const inputRef = useRef(null);
    const preSetting = useSelector(state => state.selectedPreSetting)
    const preSettingArray = useSelector(state => state.preSetting)
    const [isLoading, setLoading] = useState('')
    const socket = useSocket()

    useEffect(() => {
        setItems(['custom', ...preSettingArray])
        setLoading(preSetting)
    }, [preSettingArray]);

    const changePreSetting = (value) =>{
        socket.emit('changePreSetting', {name:value});

        setLoading(value)
    }
    const onNameChange = (event) => {
        setName(event.target.value);
    };

    const addItem = (e) => {
        e.preventDefault();
        socket.emit('addPreSettingItem', {name});

        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    return (
        <div className='setting_container'>
            <ConfigProvider
                theme={{
                    token: {
                        colorTextSecondary: '#000',
                        colorTextLabel: '#000',
                        colorTextBase: '#fff',
                        optionFontSize: '20px',
                        colorPrimaryHover: 'none',
                        optionSelectedFontWeight: '600',
                        boxShadowSecondary: 'none',

                        colorBgContainer: 'none',
                        colorBorder: 'none',

                        colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                        fontWeight: '600',
                        colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                        colorTextTertiary: '#000',
                        colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                    },
                }}
            >
                <div className='setting_selector' style={{display: 'flex', alignItems: 'center'}}>
                    <Select
                        suffixIcon={preSetting !== isLoading ? <LoadingOutlined style={{ fontSize: 24 }} spin /> : settingIcon}
                        style={{
                            width: '200px',
                            textAlign: 'center',
                        }}
                        defaultValue={preSetting}
                        value={preSetting}
                        dropdownStyle={{
                            background: 'rgba(7, 7, 7, 0.6)',
                            border: 'none',
                            padding: '10px 8px 10px',
                            textAlign: 'center',
                            width: '200px'
                        }}
                        onChange={(value)=>{changePreSetting(value)}}
                        placeholder="PreSetting"
                        dropdownRender={(menu) => (
                            <>
                                {menu}
                                <Divider
                                    style={{
                                        margin: '8px 0',
                                    }}
                                />
                                <Space
                                    style={{
                                        padding: '0 8px 4px',
                                    }}
                                >
                                    <Input
                                        placeholder="Please enter item"
                                        ref={inputRef}
                                        value={name}
                                        onChange={onNameChange}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    />
                                    <Button type="text" style={{maxWidth: '60px'}} icon={<PlusOutlined/>}
                                            onClick={addItem}></Button>
                                </Space>
                            </>
                        )}
                        options={items.map((item) => ({
                            label: item,
                            value: item,
                        }))}
                    />
                </div>

            </ConfigProvider>
        </div>
    );
};

export default PreSetting;