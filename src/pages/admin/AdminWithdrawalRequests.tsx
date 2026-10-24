import DashboardLayout from '../../components/layout/DashboardLayout';
import WithdrawalQueue from '../../components/withdrawals/WithdrawalQueue';

// Step 2 (Admin): Manager-verified payouts ko Bank UTR ke saath final release
export default function AdminWithdrawalRequests() {
  return (
    <DashboardLayout>
      <WithdrawalQueue mode="admin" />
    </DashboardLayout>
  );
}
