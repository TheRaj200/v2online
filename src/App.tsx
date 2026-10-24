import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Role Dashboard Pages
// Agent Pages
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentServices from './pages/agent/AgentServices';
import AgentServiceRequests from './pages/agent/AgentServiceRequests';
import AgentWallet from './pages/agent/AgentWallet';
import AgentProfile from './pages/agent/AgentProfile';
import AgentTerms from './pages/agent/AgentTerms';
import UserProfile from './pages/profile/UserProfile';

// Operator Pages
import OperatorDashboard from './pages/operator/OperatorDashboard';
import OperatorServiceRequests from './pages/operator/OperatorServiceRequests';
import OperatorWallet from './pages/operator/OperatorWallet';

// Distributor Pages
import DistributorDashboard from './pages/distributor/DistributorDashboard';
import ShopDeleteRequest from './pages/distributor/ShopDeleteRequest';
import ShopVerify from './pages/distributor/ShopVerify';
import DistributorProfile from './pages/distributor/DistributorProfile';
import DistributorComplaint from './pages/distributor/DistributorComplaint';

// Admin / Manager Pages
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerServices from './pages/manager/ManagerServices';
import ManagerVerifyRequests from './pages/manager/ManagerVerifyRequests';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminShops from './pages/admin/AdminShops';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminServices from './pages/admin/AdminServices';
import AdminCommissions from './pages/admin/AdminCommissions';
import AdminWallet from './pages/admin/AdminWallet';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOperators from './pages/admin/AdminOperators';
// AdminSettings page removed — System Support settings moved to UserProfile
import AdminWithdrawalRequests from './pages/admin/AdminWithdrawalRequests';
import ManagerWithdrawalRequests from './pages/manager/ManagerWithdrawalRequests';
import AdminTaskVerification from './pages/admin/AdminTaskVerification';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* 1. Agent Panel Routes */}
          <Route
            path="/agent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/services"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/my-requests"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentServiceRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/wallet"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentWallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/complaint"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <DistributorComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/complaints"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <DistributorComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/profile"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent/terms"
            element={
              <ProtectedRoute allowedRoles={['agent']}>
                <AgentTerms />
              </ProtectedRoute>
            }
          />

          {/* 2. Operator Panel Routes */}
          <Route
            path="/operator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['operator']}>
                <OperatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/service-requests"
            element={
              <ProtectedRoute allowedRoles={['operator']}>
                <OperatorServiceRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/wallet"
            element={
              <ProtectedRoute allowedRoles={['operator']}>
                <OperatorWallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/complaint"
            element={
              <ProtectedRoute allowedRoles={['operator']}>
                <DistributorComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/complaints"
            element={
              <ProtectedRoute allowedRoles={['operator']}>
                <DistributorComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operator/profile"
            element={
              <ProtectedRoute allowedRoles={['operator']}>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* 3. Distributor Panel Routes */}
          <Route
            path="/distributor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['distributor']}>
                <DistributorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/distributor/shop-list"
            element={
              <ProtectedRoute allowedRoles={['distributor']}>
                <Navigate to="/distributor/verify-shops" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/distributor/delete-shop-requests"
            element={
              <ProtectedRoute allowedRoles={['distributor']}>
                <ShopDeleteRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/distributor/verify-shops"
            element={
              <ProtectedRoute allowedRoles={['distributor']}>
                <ShopVerify />
              </ProtectedRoute>
            }
          />
          <Route
            path="/distributor/profile"
            element={
              <ProtectedRoute allowedRoles={['distributor']}>
                <DistributorProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/distributor/complaint"
            element={
              <ProtectedRoute allowedRoles={['distributor']}>
                <DistributorComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/distributor/complaints"
            element={
              <ProtectedRoute allowedRoles={['distributor']}>
                <DistributorComplaint />
              </ProtectedRoute>
            }
          />

          {/* 4. Manager Panel Routes */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/complaints"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/complaint"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/task-verification"
            element={
              <ProtectedRoute allowedRoles={['manager', 'super_admin', 'sub_admin']}>
                <AdminTaskVerification />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/profile"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* 5. Super Admin Panel Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/shops"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin']}>
                <AdminShops />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/services"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin', 'manager']}>
                <AdminServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/commissions"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin']}>
                <AdminCommissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/wallet"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin', 'manager']}>
                <AdminWallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin']}>
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaint"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin']}>
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin', 'manager']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/operators"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin', 'manager']}>
                <AdminOperators />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/withdrawal-requests"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin', 'manager']}>
                <AdminWithdrawalRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/task-verification"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin', 'manager']}>
                <AdminTaskVerification />
              </ProtectedRoute>
            }
          />
          {/* Settings page removed — merged into Profile */}
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'sub_admin']}>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* Manager access to User/Operator Management & Desks */}
          <Route
            path="/manager/users"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/operators"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <AdminOperators />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/shops"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <AdminShops />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/services"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/withdrawal-requests"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerWithdrawalRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/verify-requests"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerVerifyRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/wallet"
            element={
              <ProtectedRoute allowedRoles={['manager']}>
                <AdminWallet />
              </ProtectedRoute>
            }
          />

          {/* Sub Admin Routes (same as admin) */}
          <Route
            path="/subadmin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['sub_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Universal Profile Route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['agent', 'operator', 'distributor', 'manager', 'super_admin', 'sub_admin']}>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
