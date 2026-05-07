import { Outlet } from 'react-router-dom';

const Header = () => (
  <header style={{ padding: '1rem', background: '#1a1a2e', color: '#fff' }}>
    <h1>🍔 Food Delivery</h1>
  </header>
);

const Footer = () => (
  <footer style={{ padding: '1rem', background: '#1a1a2e', color: '#aaa', textAlign: 'center' }}>
    <p>© 2026 Food Delivery. All rights reserved.</p>
  </footer>
);

const MainLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
