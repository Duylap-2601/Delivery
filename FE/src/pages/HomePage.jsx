import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package,
  Truck,
  Car,
  Utensils, 
  ShoppingBasket, 
  Map,
  ArrowRight,
  Smartphone,
  CreditCard,
  Clock
} from 'lucide-react';

const HomePage = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1 className={isLoaded ? 'animate-fade-in-up' : ''}>
            Deliver anything, <br/>
            <span>anywhere.</span>
          </h1>
          <p className={isLoaded ? 'animate-fade-in-up delay-100' : ''}>
            The all-in-one platform for express courier, heavy trucking, food delivery, and ride-hailing. Fast, secure, and reliable.
          </p>

          <div className={`search-container ${isLoaded ? 'animate-fade-in-up delay-200' : ''}`}>
            <div className="search-bar">
              <Search className="search-icon" size={24} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="What do you need? (e.g. Deliver a document, Moving truck, Order food)"
              />
              <button className="search-btn">Find Services</button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories">
        <div className="container">
          <div className={`category-grid diverse-grid ${isLoaded ? 'animate-fade-in-up delay-300' : ''}`}>
            <div className="category-card">
              <div className="cat-icon-wrapper cat-express">
                <Package size={36} strokeWidth={2} />
              </div>
              <h3>Express Courier</h3>
              <p>Documents & Parcels</p>
            </div>
            <div className="category-card">
              <div className="cat-icon-wrapper cat-truck">
                <Truck size={36} strokeWidth={2} />
              </div>
              <h3>Truck & Moving</h3>
              <p>Heavy goods delivery</p>
            </div>
            <div className="category-card">
              <div className="cat-icon-wrapper cat-ride">
                <Car size={36} strokeWidth={2} />
              </div>
              <h3>Ride Hailing</h3>
              <p>Book a car or bike</p>
            </div>
            <div className="category-card">
              <div className="cat-icon-wrapper cat-food">
                <Utensils size={36} strokeWidth={2} />
              </div>
              <h3>Food Delivery</h3>
              <p>Hot meals</p>
            </div>
            <div className="category-card">
              <div className="cat-icon-wrapper cat-grocery">
                <ShoppingBasket size={36} strokeWidth={2} />
              </div>
              <h3>Mart & Groceries</h3>
              <p>Daily essentials</p>
            </div>
            <div className="category-card">
              <div className="cat-icon-wrapper cat-intercity">
                <Map size={36} strokeWidth={2} />
              </div>
              <h3>Intercity Delivery</h3>
              <p>Nationwide shipping</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Promotions */}
      <section className="promotions">
        <div className="container">
          <div className="section-header">
            <h2>Our Top Services</h2>
            <a href="#" className="see-all">
              View all services <ArrowRight size={18} />
            </a>
          </div>

          <div className="promo-grid">
            <div className="promo-card">
              <img 
                src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Express Delivery" 
                className="promo-img"
              />
              <div className="promo-overlay">
                <div className="promo-badge">Under 2 Hours</div>
                <h3>Express Parcels</h3>
                <p>Instant document and small package delivery within the city.</p>
              </div>
            </div>
            <div className="promo-card">
              <img 
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Trucking" 
                className="promo-img"
              />
              <div className="promo-overlay">
                <div className="promo-badge" style={{ background: '#007AFF' }}>Up to 5 Tons</div>
                <h3>House Moving</h3>
                <p>Book a truck for heavy goods or moving houses seamlessly.</p>
              </div>
            </div>
            <div className="promo-card">
              <img 
                src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                alt="Ride Hailing" 
                className="promo-img"
              />
              <div className="promo-overlay">
                <div className="promo-badge" style={{ background: '#00C853' }}>Available Now</div>
                <h3>Premium Rides</h3>
                <p>Comfortable cars and fast bikes to your destination.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div className="container">
          <h2>How it works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">
                <Smartphone size={40} strokeWidth={1.5} color="var(--primary)" />
              </div>
              <h3>1. Choose Service</h3>
              <p>Select from express delivery, trucking, ride-hailing, or food delivery in our diverse app.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <CreditCard size={40} strokeWidth={1.5} color="var(--primary)" />
              </div>
              <h3>2. Book & Pay</h3>
              <p>Enter your details and pay securely using credit card, e-wallet, or cash.</p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <Clock size={40} strokeWidth={1.5} color="var(--primary)" />
              </div>
              <h3>3. Real-time Tracking</h3>
              <p>Track your driver or courier on the live map until the job is completed.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
