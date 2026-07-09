import React from 'react';
import { HeartHandshake, Bell, Store, CheckCircle, Clock, Truck, Leaf } from 'lucide-react';

export default function LandingView({ onNavigate, stats }) {
  const servingsClaimed = stats?.totalServingsClaimed || 1200;
  const co2Saved = stats?.co2SavedKg || 540;
  const partnersCount = (stats?.donorsCount || 4) + (stats?.recipientsCount || 1);

  return (
    <section className="view-section">
      <div className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <span className="eco-badge">
              <Leaf size={14} style={{ marginRight: '6px' }} /> Join the Zero Waste Movement
            </span>
            <h1>Rescue Surplus Food, <br /><span className="gradient-text">Feed Communities</span></h1>
            <p>ShareMeal bridges the gap between surplus food donors (restaurants, caterers, grocers) and organizations in need. Donate excess meals or rescue food in real time.</p>
            <div className="hero-buttons">
              <button className="btn btn-primary btn-lg" onClick={() => onNavigate('donate')}>
                Donate Surplus Food
              </button>
              <button className="btn btn-outline-alt btn-lg" onClick={() => onNavigate('browse')}>
                Rescue Available Food
              </button>
            </div>
            
            <div className="hero-stats">
              <div className="hero-stat-card">
                <h3>{servingsClaimed}+</h3>
                <p>Meals Rescued</p>
              </div>
              <div className="hero-stat-card">
                <h3>{co2Saved} kg</h3>
                <p>CO2 Saved</p>
              </div>
              <div className="hero-stat-card">
                <h3>{partnersCount}+</h3>
                <p>Partners Active</p>
              </div>
            </div>
          </div>
          
          <div className="hero-image-wrapper">
            <div className="hero-blob"></div>
            <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80" 
              alt="Fresh vegetables basket" 
              className="hero-image" 
            />
            <div className="hero-floating-card top-card">
              <Clock className="icon-orange" size={20} />
              <div>
                <strong>Active Rescues</strong>
                <p>Fresh meals available now</p>
              </div>
            </div>
            <div className="hero-floating-card bottom-card">
              <CheckCircle className="icon-green" size={20} />
              <div>
                <strong>Easy Coordination</strong>
                <p>Self-pickup, zero hassle</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="features-section" id="about">
        <div className="section-title-wrapper">
          <span className="sub-title">How It Works</span>
          <h2>A Simple Solution to Food Waste</h2>
          <p>We make it extremely easy to publish, track, and coordinate food handovers.</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon icon-bg-green">
              <Store size={24} />
            </div>
            <h3>1. List Surplus</h3>
            <p>Donors quickly list food items, quantities, expiry window, and pickup coordinates.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon icon-bg-blue">
              <Bell size={24} />
            </div>
            <h3>2. Instant Alerts</h3>
            <p>NGOs and charity networks receive lists and check real-time availability in their browser.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon icon-bg-orange">
              <Truck size={24} />
            </div>
            <h3>3. Rapid Pickup</h3>
            <p>Recipients claim the food, instantly lock the listing, and collect it before expiry.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
