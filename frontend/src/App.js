import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import TableSelect from "./components/TableSelect";
import Catalog from "./components/Catalog";
import Cart from "./components/Cart";
import AdminLogin from "./components/admin/AdminLogin";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminMenu from "./components/admin/AdminMenu";
import AdminHistory from "./components/admin/AdminHistory";
import AdminTable from "./components/admin/AdminTable";
import AdminCashier from "./components/admin/AdminCashier";
import AdminSettings from "./components/admin/AdminSettings";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentPage from "./components/PaymentPage";
import WaitingCashier from "./components/WaitingCashier";
import Invoice from "./components/Invoice";
import "./App.css";

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/admin" element={<AdminLogin />} />
                    <Route
                        path="/admin/dashboard"
                        element={<AdminDashboard />}
                    />
                    <Route path="/admin/menu" element={<AdminMenu />} />
                    <Route path="/admin/history" element={<AdminHistory />} />
                    <Route path="/admin/tables" element={<AdminTable />} />
                    <Route path="/admin/cashier" element={<AdminCashier />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/checkout/payment" element={<PaymentPage />} />
                    <Route
                        path="/checkout/waiting-cashier"
                        element={<WaitingCashier />}
                    />
                    <Route
                        path="/checkout/success"
                        element={<PaymentSuccess />}
                    />
                    <Route path="/invoice/:orderId" element={<Invoice />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
