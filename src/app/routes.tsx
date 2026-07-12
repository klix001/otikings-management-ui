import { createBrowserRouter } from "react-router";
import StaffLayout from "./components/layouts/StaffLayout";
import KitchenLayout from "./components/layouts/KitchenLayout";
import AdminLayout from "./components/layouts/AdminLayout";
import StaffDashboard from "./components/staff/StaffDashboard";
import Inventory from "./components/staff/Inventory";
import Suppliers from "./components/staff/Suppliers";
import Creditors from "./components/staff/Creditors";
import Lodge from "./components/staff/Lodge";
import Expenses from "./components/staff/Expenses";
import CashSubmission from "./components/staff/CashSubmission";
import ShiftNotes from "./components/staff/ShiftNotes";
import AdminDashboard from "./components/admin/AdminDashboard";
import CashApproval from "./components/admin/CashApproval";
import CashHistory from "./components/admin/CashHistory";
import SupplierComparison from "./components/admin/SupplierComparison";
import AdminCreditors from "./components/admin/AdminCreditors";
import BarManagement from "./components/admin/BarManagement";
import KitchenManagement from "./components/admin/KitchenManagement";
import AdminExpenses from "./components/admin/AdminExpenses";
import SupplierManagement from "./components/admin/SupplierManagement";
import StaffManagement from "./components/admin/StaffManagement";
import LodgeManagement from "./components/admin/LodgeManagement";
import Login from "./components/Login";


export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/staff",
    Component: StaffLayout,
    children: [
      { index: true, Component: StaffDashboard },

      { path: "inventory", Component: Inventory },
      { path: "suppliers", Component: Suppliers },
      { path: "creditors", Component: Creditors },
      { path: "lodge", Component: Lodge },
      { path: "expenses", Component: Expenses },
      { path: "cash-submission", Component: CashSubmission },
      { path: "notes", Component: ShiftNotes },
    ],
  },
  {
    path: "/kitchen-staff",
    Component: KitchenLayout,
    children: [
      { index: true, Component: StaffDashboard },
      { path: "inventory", Component: Inventory },
      { path: "creditors", Component: Creditors },
      { path: "expenses", Component: Expenses },
      { path: "cash-submission", Component: CashSubmission },
      { path: "notes", Component: ShiftNotes },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "cash-approval", Component: CashApproval },
      { path: "cash-history", Component: CashHistory },
      { path: "suppliers", Component: SupplierManagement },
      { path: "creditors", Component: AdminCreditors },
      { path: "expenses", Component: AdminExpenses },
      { path: "bar", Component: BarManagement },
      { path: "kitchen", Component: KitchenManagement },
      { path: "lodge", Component: LodgeManagement },
      { path: "staff", Component: StaffManagement },
    ],
  },
]);
