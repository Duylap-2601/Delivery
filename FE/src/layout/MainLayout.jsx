import React from 'react';
import { Outlet } from 'react-router-dom';
import { MapPin, ShoppingBag, User, Box } from 'lucide-react';

const Header = () => (
  <nav className="navbar">
    <div className="container">
      <div className="logo">
        <div style={{ background: 'var(--primary)', color: 'white', padding: '4px', borderRadius: '8px' }}>
          <Box size={24} strokeWidth={2.5} />
        </div>
        Cravo Logistics
      </div>

      <div className="location-picker">
        <MapPin size={18} color="var(--primary)" />
        <span>Ho Chi Minh, VN</span>
      </div>

      <div className="nav-actions">
        <button className="icon-btn">
          <User size={20} />
        </button>
        <button className="icon-btn">
          <ShoppingBag size={20} />
        </button>
      </div>
    </div>
  </nav>
);

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-top">
        <div className="footer-brand">
          <h2>Cravo Logistics</h2>
          <p>Your diverse platform for transport and delivery. Send packages, move houses, order food, or book a ride with ease.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Services</h4>
            <ul>
              <li><a href="#">Express Delivery</a></li>
              <li><a href="#">Trucking & Moving</a></li>
              <li><a href="#">Ride Hailing</a></li>
              <li><a href="#">Food & Mart</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Partners</h4>
            <ul>
              <li><a href="#">Become a Driver</a></li>
              <li><a href="#">Fleet Management</a></li>
              <li><a href="#">Merchant Portal</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Cravo Logistics Inc. All rights reserved.</p>
        <p>Moving the world forward</p>
      </div>
    </div>
  </footer>
);

const MainLayout = () => {
  return (
    <div className="app">
      <Header />
      <main style={{ minHeight: 'calc(100vh - 400px)' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
