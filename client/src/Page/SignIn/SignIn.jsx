import {
  Layout,
  Button,
  Row,
  Col,
  Form,
  Input,
  ConfigProvider
} from "antd"
import {url} from "../../Config.jsx";
import axios from "axios";
import React from "react";
import {useNotification} from "../../Components/Notification/NotificationContext.jsx";
import {useDispatch} from "react-redux";
import {useSocket} from "../../Components/Socket/Socket.jsx";

const SignIn  = () => {
  const {Content} = Layout;
  const { openNotificationWithIcon } = useNotification();
  const socket = useSocket()

  const onFinish = async (values) => {
    axios.post(`${url}/api/v1/login`, {...values}, {withCredentials: true}).then(({data}) => {
      if (data.success) {
        openNotificationWithIcon('success','Success','Запрос на авторизацию отправлен, не обновляйте страницу!' );
        socket.emit('waitLogin', {key:data?.key});
      } else {
        openNotificationWithIcon(data.success ? 'success' : 'error', data.success ? 'Success' : 'Error', data?.message);
      }
    }).catch((error) => {
      openNotificationWithIcon('error', 'Error', error.message);
    });
  };

  return (
      <>
        <Layout className="layout-default layout-signin" style={{background: '#000'}}>
          <Content className="signin">
            <Row gutter={[24, 0]} justify="space-around">
              <Col
                  xs={{span: 24, offset: 0}}
                  md={{span: 6}}
              >
                <Form
                    onFinish={onFinish}
                    layout="vertical"
                    className="row-col"
                    autoComplete="off"
                >

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
                        className="username"
                        name="username"
                        rules={[
                          {
                            required: true,
                            message: "Enter your login",
                          },
                        ]}
                    >
                      <Input name="username" placeholder="Username"
                             style={{height: '48px', padding: '8px 22px', border:'1px solid rgba(255,255,255,0.2)'}}/>
                    </Form.Item>
                  </ConfigProvider>

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
                        className="username"
                        name="password"
                        rules={[
                          {
                            required: true,
                            message: "Enter your password",
                          },
                        ]}
                    >
                      <Input.Password name="password" placeholder="Password" style={{height: '48px', border:'1px solid rgba(255,255,255,0.2)'}}/>
                    </Form.Item>
                  </ConfigProvider>
                  <ConfigProvider
                      theme={{
                        token: {
                          controlOutline: 'none',
                          colorPrimary: '#1A1A1A',
                          colorPrimaryHover: 'rgba(240, 216, 90, 0.6)',
                        },

                      }}
                  >
                  <Form.Item>
                    <Button
                        type="primary"
                        className='login_button'
                        htmlType="submit"
                        style={{width: "100%",  color:'rgba(255,255,255,.8)'}}
                    >
                      Login
                    </Button>
                  </Form.Item>
                </ConfigProvider>
                </Form>
              </Col>
            </Row>
          </Content>
        </Layout>
      </>
  );
}

export default SignIn;