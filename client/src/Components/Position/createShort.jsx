import React from 'react';
import {Button, ConfigProvider} from "antd";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";

const CreateShort = () => {

    const openShort = () =>{
        openNotificationWithIcon('error', 'Не удалось открыть позицию', 'Error: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans.');

    }

    return (
        <div>
            <div>
                <ConfigProvider
                    theme={{
                        components: {
                            Button: {
                                colorPrimary: `rgb(246, 70, 93)`,
                                fontWeight: '600',
                                colorPrimaryHover: `rgb(246, 70, 93,0.8)`,
                                colorPrimaryActive: `rgb(246, 70, 93,0.8)`,
                                lineWidth: 0,
                            },
                        },
                    }}
                >
                    <Button style={{width: '160px', height: '50px'}} onClick={()=>openShort()} type="primary" size="large">
                        Open Short
                    </Button>
                </ConfigProvider>
            </div>
        </div>
    );
};

export default CreateShort;