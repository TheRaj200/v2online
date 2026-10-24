import DashboardLayout from '../../components/layout/DashboardLayout';
import WithdrawalQueue from '../../components/withdrawals/WithdrawalQueue';

// Step 1 (Manager): Operator / Distributor withdrawal requests verify karke Admin ko forward (pehle mock data tha)
export default function ManagerWithdrawalRequests() {
  return (
    <DashboardLayout>
      <WithdrawalQueue mode="manager" />
    </DashboardLayout>
  );
}
