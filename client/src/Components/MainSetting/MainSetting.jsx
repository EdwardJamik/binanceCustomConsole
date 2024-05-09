import React, {useEffect, useState} from 'react';
import {Button, Checkbox, ConfigProvider, Form, Input} from "antd";
import axios from "axios";
import {url} from "../../Config.jsx";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";

const MainSetting = () => {
    const [form] = Form.useForm();
    const [isUser, setUser] = useState(null)

    const onFinishSetting = async (values) => {
            axios.post(`${url}/api/v1/changeAccountBinance`, {...values}, {withCredentials: true}).then(({data}) => {
                if (data.status) {
                    openNotificationWithIcon(data.success ? 'success' : 'error', data.success ? 'Success' : 'Error', data?.message);
                } else if(data && data.message) {
                    openNotificationWithIcon(data.success ? 'success' : 'error', data.success ? 'Success' : 'Error', data?.message);
                }
            }).catch((error) => {
                openNotificationWithIcon('error', 'Error', error.message);
            });
    };

    useEffect(() => {
        axios.post(`${url}/api/v1/getUserBinanceData`, {}, {withCredentials: true}).then(({data}) => {
            if (data && data.status) {
                setUser({...data})
            } else if(data && data.message){
                openNotificationWithIcon('warning', 'Warning', data.message);
            }
        }).catch((error) => {
            openNotificationWithIcon('error', 'Error', error.message);
        });
    }, []);

    return (
        <div className='otherSettings'>
            {isUser !== null &&
                (
                    <Form
                        form={form}
                        onFinish={onFinishSetting}
                        initialValues={isUser}
                    >
                        <div className='key_1' style={{position: 'relative'}}>
                            <div>
                                <span className="gold">Binance API Key</span>
                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Form.Item
                                        name="key_1"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Enter your Binance API key",
                                            },
                                        ]}
                                    >
                                        <Input.Password name="key_1" placeholder="Binance API Key"
                                                        style={{
                                                            height: '48px',
                                                            width: '100%',
                                                            border: '1px solid rgba(255,255,255,0.2)'
                                                        }}/>
                                    </Form.Item>
                                </ConfigProvider>
                            </div>
                        </div>

                            <div className="key_2" style={{position: 'relative'}}>
                                <span className="gold">Binance API Secret Key</span>

                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Form.Item
                                        name="key_2"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Enter your Binance API Secret Key",
                                            },
                                        ]}
                                    >
                                    <Input.Password name="key_2" placeholder="Binance API Secret Key" style={{
                                        height: '48px',
                                        width: '100%',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}/>
                                    </Form.Item>
                                </ConfigProvider>

                            </div>


                            <div className="chat_id" style={{position: 'relative'}}>
                                <span className="gold">Telegram chat_id</span>

                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Form.Item
                                        name="chat_id"
                                        rules={[
                                            {
                                                required: true,
                                                message: "Enter your telegram chat_id",
                                            },
                                        ]}
                                    >
                                    <Input name="chat_id" placeholder="Telegram chat_id" style={{
                                        height: '48px',
                                        width: '100%',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}/>
                                    </Form.Item>
                                </ConfigProvider>

                            </div>

                        <div className="binance_test" style={{position: 'relative'}}>
                            <span className="gold">Type Binance market</span>

                            <ConfigProvider
                                theme={{
                                    token: {
                                        colorTextBase: '#fff',
                                        colorBorder: '#0E0E0E',
                                        controlOutline: 'none',
                                        colorBgElevated: '#131313',
                                        colorBgContainer: '#0E0E0E',
                                        colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                        colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                        colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                        colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                    },

                                }}
                            >
                                <Form.Item
                                    name="binance_test"
                                    valuePropName="checked"
                                >
                                <Checkbox style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: '48px',
                                    width: '100%',
                                }}
                                name='binance_test'
                                >
                                    Binance test market
                                </Checkbox>
                                </Form.Item>

                            </ConfigProvider>
                        </div>


                        <Form.Item>
                            <ConfigProvider
                                theme={{
                                    token: {
                                        controlOutline: 'none',
                                        colorPrimary: '#000',
                                        colorPrimaryHover: 'rgba(240, 216, 90, 0.6)',
                                    },

                                }}
                            >
                                <Button
                                    type="primary"
                                    className='login_button'
                                    htmlType="submit"
                                    style={{
                                        display: 'block',
                                        width: "100%",
                                        maxWidth: '320px',
                                        margin: '0 auto',
                                        color: 'rgba(255,255,255,.8)'
                                    }}
                                >
                                    Save
                                </Button> </ConfigProvider>
                        </Form.Item>

                    </Form>
            )
        }
            { isUser === null && (
                <Form
                    form={form}
                    onFinish={onFinishSetting}
                >
                    <div className='key_1' style={{position: 'relative'}}>
                        <div>
                            <span className="gold">Binance API Key</span>
                            <ConfigProvider
                                theme={{
                                    token: {
                                        colorTextBase: '#fff',
                                        colorBorder: '#0E0E0E',
                                        controlOutline: 'none',
                                        colorBgElevated: '#131313',
                                        colorBgContainer: '#0E0E0E',
                                        colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                        colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                        colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                        colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                    },

                                }}
                            >
                                <Form.Item
                                    name="key_1"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Enter your Binance API key",
                                        },
                                    ]}
                                >
                                    <Input.Password name="key_1" placeholder="Binance API Key"
                                                    style={{
                                                        height: '48px',
                                                        width: '100%',
                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                    }}/>
                                </Form.Item>
                            </ConfigProvider>
                        </div>
                    </div>

                    <div className="key_2" style={{position: 'relative'}}>
                        <span className="gold">Binance API Secret Key</span>

                        <ConfigProvider
                            theme={{
                                token: {
                                    colorTextBase: '#fff',
                                    colorBorder: '#0E0E0E',
                                    controlOutline: 'none',
                                    colorBgElevated: '#131313',
                                    colorBgContainer: '#0E0E0E',
                                    colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                    colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                    colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                    colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                },

                            }}
                        >
                            <Form.Item
                                name="key_2"
                                rules={[
                                    {
                                        required: true,
                                        message: "Enter your Binance API Secret Key",
                                    },
                                ]}
                            >
                                <Input.Password name="key_2" placeholder="Binance API Secret Key" style={{
                                    height: '48px',
                                    width: '100%',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}/>
                            </Form.Item>
                        </ConfigProvider>

                    </div>


                    <div className="chat_id" style={{position: 'relative'}}>
                        <span className="gold">Telegram chat_id</span>

                        <ConfigProvider
                            theme={{
                                token: {
                                    colorTextBase: '#fff',
                                    colorBorder: '#0E0E0E',
                                    controlOutline: 'none',
                                    colorBgElevated: '#131313',
                                    colorBgContainer: '#0E0E0E',
                                    colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                    colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                    colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                    colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                },

                            }}
                        >
                            <Form.Item
                                name="chat_id"
                                rules={[
                                    {
                                        required: true,
                                        message: "Enter your telegram chat_id",
                                    },
                                ]}
                            >
                                <Input name="chat_id" placeholder="Telegram chat_id" style={{
                                    height: '48px',
                                    width: '100%',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}/>
                            </Form.Item>
                        </ConfigProvider>

                    </div>

                    <div className="binance_test" style={{position: 'relative'}}>
                        <span className="gold">Type Binance market</span>

                        <ConfigProvider
                            theme={{
                                token: {
                                    colorTextBase: '#fff',
                                    colorBorder: '#0E0E0E',
                                    controlOutline: 'none',
                                    colorBgElevated: '#131313',
                                    colorBgContainer: '#0E0E0E',
                                    colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                    colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                    colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                    colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                },

                            }}
                        >
                            <Form.Item
                                name="binance_test"
                                valuePropName="checked"
                            >
                                <Checkbox style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    height: '48px',
                                    width: '100%',
                                }}
                                          name='binance_test'
                                >
                                    Binance test market
                                </Checkbox>
                            </Form.Item>

                        </ConfigProvider>
                    </div>


                    <Form.Item>
                        <ConfigProvider
                            theme={{
                                token: {
                                    controlOutline: 'none',
                                    colorPrimary: '#000',
                                    colorPrimaryHover: 'rgba(240, 216, 90, 0.6)',
                                },

                            }}
                        >
                            <Button
                                type="primary"
                                className='login_button'
                                htmlType="submit"
                                style={{
                                    display: 'block',
                                    width: "100%",
                                    maxWidth: '320px',
                                    margin: '0 auto',
                                    color: 'rgba(255,255,255,.8)'
                                }}
                            >
                                Save
                            </Button> </ConfigProvider>
                    </Form.Item>
                </Form>
            )}
        </div>
    );
};

export default MainSetting;