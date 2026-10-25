import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { MainLayout } from './layouts/MainLayout';

import { Overview } from './pages/Overview';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { ServiceHealth } from './pages/ServiceHealth';
import { AnomalyDetection } from './pages/AnomalyDetection';
import { IncidentCenter } from './pages/IncidentCenter';
import { RecoveryCenter } from './pages/RecoveryCenter';
import { IncidentHistory } from './pages/IncidentHistory';
import { Settings } from './pages/Settings';
import { DemoLab } from './pages/DemoLab';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Overview />} />
            <Route path="live" element={<LiveMonitoring />} />
            <Route path="services" element={<ServiceHealth />} />
            <Route path="anomalies" element={<AnomalyDetection />} />
            <Route path="incidents" element={<IncidentCenter />} />
            <Route path="recovery" element={<RecoveryCenter />} />
            <Route path="history" element={<IncidentHistory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="demo" element={<DemoLab />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
