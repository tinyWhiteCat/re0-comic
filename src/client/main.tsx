import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Workbench } from './Workbench';
import 'antd/dist/reset.css';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{
      token: { colorPrimary: '#477c4b', borderRadius: 9, colorBgLayout: '#f5f6f0', fontFamily: 'Inter, "Noto Sans CJK SC", system-ui, sans-serif' },
      components: { Layout: { siderBg: '#173c33', headerBg: '#f5f6f0' }, Menu: { darkItemBg: '#173c33', darkItemSelectedBg: '#315b49' } },
    }}>
      <App><Workbench /></App>
    </ConfigProvider>
  </React.StrictMode>,
);
