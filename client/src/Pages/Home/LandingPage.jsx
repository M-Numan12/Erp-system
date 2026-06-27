import React from 'react';
import { Link } from 'react-router-dom';
import '../../Styles/LandingPage.scss';
import { 
  Building2, 
  ShieldCheck, 
  Truck, 
  Users, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Star, 
  ArrowRight, 
  CheckCircle2, 
  Database, 
  Warehouse, 
  Award,
  ChevronRight
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* 1. Navigation Header */}
      <header className="nav-header">
        <Link to="/" className="logo">
          <Building2 size={28} color="#b89047" />
          <span>Data Waley <span className="gold-accent">Cement</span></span>
        </Link>
        
        <nav className="nav-links">
          <a href="#products">Products</a>
          <a href="#about">About Legacy</a>
          <a href="#locations">Our Locations</a>
          <a href="#ceo-message">CEO Message</a>
          <a href="#contact">Contact</a>
        </nav>
        
        <div className="portal-buttons">
          <Link to="/login" className="btn-portal-user">Staff Portal</Link>
          <Link to="/portal-admin" className="btn-portal-admin">Admin Portal</Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-tag">ESTABLISHED 1978</span>
          <h1>BUILDING LAHORE <br /><span className="gold-accent">SINCE 1978</span></h1>
          <p className="hero-desc">
            Your trusted partner for premium construction materials. Supplying high-grade cement, 
            steel sariya, bricks, and aggregates to Punjab's landmark developments for over 46 years.
          </p>
          <div className="hero-ctas">
            <a href="#contact" className="btn-gold">
              Request a Quote <ArrowRight size={18} />
            </a>
            <a href="#products" className="btn-outline">Explore Products</a>
          </div>
        </div>
      </section>

      {/* 3. Statistics Section */}
      <section className="stats-section section-padding">
        <div className="stats-grid">
          <div className="stat-card glass-card">
            <div className="stat-num">50k+</div>
            <div className="stat-label">Customers Served</div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-num">250+</div>
            <div className="stat-label">Retail Partners</div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-num">46+</div>
            <div className="stat-label">Years of Legacy</div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-num">2</div>
            <div className="stat-label">Retail Depots</div>
          </div>
        </div>
      </section>

      {/* 4. Vision Section */}
      <section id="about" className="vision-section section-padding">
        <div className="vision-content">
          <h2>BUILDING A STRONGER <span className="gold-accent">PAKISTAN</span></h2>
          <p>
            For more than four decades, Data Waley Cement Depot has stood as a symbol of reliability 
            and strength in Punjab's construction sector. We empower builders, developers, and homeowners 
            by delivering premium-grade brick, cement, and steel materials that stand the test of time. 
            Our commitment is rooted in integrity, ensuring that every grain of sand and bar of steel 
            we supply contributes to a safer, stronger, and more prosperous nation.
          </p>
        </div>
      </section>

      {/* 5. Products Section */}
      <section id="products" className="products-section section-padding">
        <div className="section-header">
          <h2>PREMIUM <span className="gold-accent">CONSTRUCTION MATERIALS</span></h2>
          <p>We source and distribute only the highest-rated building materials from trusted national brands.</p>
        </div>

        <div className="products-grid">
          {/* Cement Card */}
          <div className="product-card glass-card">
            <div 
              className="product-image" 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Premium Cement</h3>
              </div>
              <p>
                Providing high-strength OPC and SRC cements suitable for heavy foundations, slabs, 
                and all general construction work. Engineered for durability and crack resistance.
              </p>
              <div className="brand-badges">
                <span className="badge">DG Khan Cement</span>
                <span className="badge">Pioneer Cement</span>
                <span className="badge">Flying Cement</span>
                <span className="badge">Kohat Cement</span>
                <span className="badge">Maple Leaf</span>
              </div>
            </div>
          </div>

          {/* Steel Card */}
          <div className="product-card glass-card">
            <div 
              className="product-image" 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Grade-60 Steel Sariya</h3>
              </div>
              <p>
                Deformed steel rebars featuring high yield strength, outstanding bendability, 
                and excellent bond strength with concrete. Ideal for residential and commercial RCC structures.
              </p>
              <div className="brand-badges">
                <span className="badge">Mughal Steel</span>
                <span className="badge">Ravi Steel</span>
                <span className="badge">Islamabad Steel</span>
                <span className="badge">Ittehad Steel</span>
              </div>
            </div>
          </div>

          {/* Bricks Card */}
          <div className="product-card glass-card">
            <div 
              className="product-image" 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Kailash Clay Bricks</h3>
              </div>
              <p>
                Premium clay bricks, thoroughly baked in traditional kilns. Offers rich red color, 
                precise rectangular dimensions, high compressive strength, and low water absorption.
              </p>
              <div className="brand-badges">
                <span className="badge">Awwal (1st Class) Bricks</span>
                <span className="badge">Doyam (2nd Class) Bricks</span>
                <span className="badge">Special Selected Bricks</span>
              </div>
            </div>
          </div>

          {/* Aggregates Card */}
          <div className="product-card glass-card">
            <div 
              className="product-image" 
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=600&q=80')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Aggregates & Sand</h3>
              </div>
              <p>
                Sourced from Margalla and Sargodha hills. Clean river sand and bajri, screened 
                and washed to ensure high concrete strength and superior plaster finishes.
              </p>
              <div className="brand-badges">
                <span className="badge">Margalla Crush (A-Grade)</span>
                <span className="badge">Sargodha Crush</span>
                <span className="badge">Ravi Chenab Sand</span>
                <span className="badge">Fine Bajri</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ERP Tech Operations Section */}
      <section className="tech-section section-padding">
        <div className="tech-container">
          <div className="tech-content">
            <h2>POWERED BY TECHNOLOGY. <br /><span className="gold-accent">DRIVEN BY TRUST.</span></h2>
            <p className="tech-desc">
              We leverage modern enterprise resource planning (ERP) technology to manage our supply chain 
              seamlessly. From order booking to final delivery, our digital system ensures precision, 
              accountability, and transparency for every bag of cement and ton of steel.
            </p>
            <div className="tech-bullets">
              <div className="bullet">
                <CheckCircle2 size={24} color="#b89047" style={{ marginTop: '3px' }} />
                <div className="bullet-text">
                  <h4>Real-time Inventory Tracking</h4>
                  <p>Our digital warehouse system guarantees that products marked 'in-stock' are physically ready for immediate loading.</p>
                </div>
              </div>
              <div className="bullet">
                <CheckCircle2 size={24} color="#b89047" style={{ marginTop: '3px' }} />
                <div className="bullet-text">
                  <h4>Automated Fleet Dispatch</h4>
                  <p>Logistics tracking ensures that delivery trucks are routed optimally to reach your building site on schedule.</p>
                </div>
              </div>
              <div className="bullet">
                <CheckCircle2 size={24} color="#b89047" style={{ marginTop: '3px' }} />
                <div className="bullet-text">
                  <h4>Digital Billing & Statements</h4>
                  <p>Clear, error-free automated invoices and account statements, accessible instantly by our staff and retail partners.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="tech-visual">
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80" 
              alt="Analytics Dashboard" 
            />
          </div>
        </div>
      </section>

      {/* 7. Why Choose Us Section */}
      <section className="why-section section-padding">
        <div className="why-header">
          <h2>BUILT ON TRUST. <span className="gold-accent">PROVEN BY TIME.</span></h2>
        </div>
        <div className="why-grid">
          <div className="why-card glass-card">
            <div className="why-icon">
              <Calendar size={28} color="#b89047" />
            </div>
            <h3>46 Years Experience</h3>
            <p>Unmatched industry knowledge, providing the right structural materials for Punjab's unique soil and climate conditions.</p>
          </div>
          <div className="why-card glass-card">
            <div className="why-icon">
              <Truck size={28} color="#b89047" />
            </div>
            <h3>Fast Same-Day Dispatch</h3>
            <p>Our dedicated transport fleet ensures prompt delivery within 24 hours of order confirmation across Lahore and suburbs.</p>
          </div>
          <div className="why-card glass-card">
            <div className="why-icon">
              <Warehouse size={28} color="#b89047" />
            </div>
            <h3>Massive Inventory</h3>
            <p>We maintain a constant stock of thousands of cement bags and tons of steel, shielding our clients from market shortages.</p>
          </div>
          <div className="why-card glass-card">
            <div className="why-icon">
              <Database size={28} color="#b89047" />
            </div>
            <h3>ERP Powered Accuracy</h3>
            <p>Zero manual calculation errors in billing or loading, ensuring you receive exactly what you paid for, down to the last rebar.</p>
          </div>
        </div>
      </section>

      {/* 8. Supply & Logistics Section */}
      <section className="supply-section section-padding">
        <div className="supply-container">
          <div className="supply-content">
            <h2>SUPPLY ACROSS <br /><span className="gold-accent">ALL OF PUNJAB</span></h2>
            <p>
              With a robust distribution network and a dedicated heavy-vehicle transport fleet, 
              we possess the logistics power to supply raw materials to projects of any scale. 
              Whether it is a single-family residential home in Lahore or a large-scale commercial highway 
              infrastructure project in Punjab, we deliver strength to your doorstep.
            </p>
            <div className="supply-features">
              <div className="supply-feat-card glass-card">
                <h4>Bulk Orders</h4>
                <p>Special factory-direct discount rates for bulk shipments of cement and steel rebars.</p>
              </div>
              <div className="supply-feat-card glass-card">
                <h4>Flexible Fleet</h4>
                <p>A diverse fleet ranging from small loading dumpers to large multi-axle trailers for narrow streets or open sites.</p>
              </div>
            </div>
          </div>
          <div className="supply-images">
            <img 
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80" 
              alt="Logistics warehouse" 
              className="full-width-img"
            />
            <img 
              src="https://images.unsplash.com/photo-1516576888888-8888b19240f5?auto=format&fit=crop&w=200&q=80" 
              alt="Cement bag loading" 
            />
            <img 
              src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=200&q=80" 
              alt="Delivery Truck" 
            />
          </div>
        </div>
      </section>

      {/* 9. Physical Locations Section */}
      <section id="locations" className="locations-section section-padding">
        <div className="locations-header">
          <h2>TWO DEPOTS. <span className="gold-accent">ONE HIGHEST STANDARD.</span></h2>
          <p>Visit our physical locations for order booking, stock inspection, or expert consultation.</p>
        </div>
        <div className="locations-grid">
          {/* Main Location */}
          <div className="location-card glass-card">
            <div className="loc-header">
              <MapPin size={28} color="#b89047" />
              <h3>Main Depot (Kot Abdul Malik)</h3>
            </div>
            <div className="loc-details">
              <div className="detail-item">
                <span className="info-label">Address:</span>
                <span>Kot Abdul Malik, Near Motorway Interchange, Lahore, Punjab.</span>
              </div>
              <div className="detail-item">
                <Phone size={18} color="#b89047" style={{ marginTop: '3px' }} />
                <span><span className="info-label">Phone:</span>0334-4294300</span>
              </div>
              <div className="detail-item">
                <Clock size={18} color="#b89047" style={{ marginTop: '3px' }} />
                <span><span className="info-label">Hours:</span>Monday - Saturday: 8:00 AM - 8:00 PM</span>
              </div>
            </div>
            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-outline btn-map"
            >
              Get Directions <ChevronRight size={16} />
            </a>
          </div>

          {/* Branch Location */}
          <div className="location-card glass-card">
            <div className="loc-header">
              <MapPin size={28} color="#b89047" />
              <h3>Sharaqpur Branch</h3>
            </div>
            <div className="loc-details">
              <div className="detail-item">
                <span className="info-label">Address:</span>
                <span>Adda Tredewali, Main Jaranwala Road, Near Sharaqpur, Punjab.</span>
              </div>
              <div className="detail-item">
                <Phone size={18} color="#b89047" style={{ marginTop: '3px' }} />
                <span><span className="info-label">Phone:</span>0311-4105840</span>
              </div>
              <div className="detail-item">
                <Clock size={18} color="#b89047" style={{ marginTop: '3px' }} />
                <span><span className="info-label">Hours:</span>Monday - Saturday: 8:00 AM - 8:00 PM</span>
              </div>
            </div>
            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-outline btn-map"
            >
              Get Directions <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* 10. Testimonials Section */}
      <section className="testimonials-section section-padding">
        <div className="test-header">
          <h2>TRUSTED BY <span className="gold-accent">PUNJAB'S LEADING BUILDERS</span></h2>
        </div>
        <div className="testimonials-grid">
          <div className="test-card glass-card">
            <div className="stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#b89047" color="#b89047" />)}
            </div>
            <p className="quote">
              "We have been buying cement and grade-60 steel from Data Waley for over a decade now. 
              Their stock reliability is unparalleled. Even during extreme market shortages, they fulfilled 
              our warehouse requirements without raising prices unfairly."
            </p>
            <div className="client-info">
              <h4>Muhammad Aslam</h4>
              <p>Civil Contractor, Lahore</p>
            </div>
          </div>

          <div className="test-card glass-card">
            <div className="stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#b89047" color="#b89047" />)}
            </div>
            <p className="quote">
              "Their new digital billing system is incredibly convenient. I can check our loading receipts, 
              verify outstanding dues, and get automated statements instantly. Extremely professional operation 
              for a traditional market."
            </p>
            <div className="client-info">
              <h4>Ahmed Khan</h4>
              <p>Developer, Khan Builders Ltd.</p>
            </div>
          </div>

          <div className="test-card glass-card">
            <div className="stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#b89047" color="#b89047" />)}
            </div>
            <p className="quote">
              "Fast same-day delivery is the main reason we partner with them. When we are pouring concrete, 
              any delay in cement supply costs thousands. Data Waley's fleet always delivers on time, without fail."
            </p>
            <div className="client-info">
              <h4>Mian Rashid Mahmood</h4>
              <p>Retail Partner, Sharaqpur</p>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CEO Message Section */}
      <section id="ceo-message" className="ceo-section section-padding">
        <div className="ceo-container">
          <div className="ceo-photo">
            <img 
              src="/ceo.jpg" 
              alt="CEO Mian Hassam Ahmad" 
            />
          </div>
          <div className="ceo-content">
            <span className="ceo-tag">A Message From Our CEO</span>
            <h2>BUILDING TRUST. <br /><span className="gold-accent">DELIVERING EXCELLENCE.</span></h2>
            <p>
              "Since our inception in 1978, the core philosophy of Data Waley Cement Depot has been simple: 
              provide materials of such outstanding strength and reliability that our customers can build 
              with absolute confidence. We do not just sell cement and steel; we provide the foundational 
              strength for homes where families grow, and infrastructures where the nation thrives. 
              As we step into a digital era powered by modern ERP logistics, our commitment to honesty, 
              fair pricing, and customer satisfaction remains as unshakeable as the concrete we supply."
            </p>
            <div className="ceo-signature-block">
              <h4 className="ceo-name">Mian Hassam Ahmad</h4>
              <p className="ceo-title">Chief Executive Officer</p>
              <p className="signature">Mian Hassam Ahmad</p>
            </div>
          </div>
        </div>
      </section>

      {/* 12. Footer & Final CTA */}
      <footer id="contact" className="footer-section section-padding">
        <div className="cta-banner">
          <h2>READY TO BUILD WITH <span className="gold-accent">ABSOLUTE CONFIDENCE?</span></h2>
          <p>Contact our sales desk today for bulk rates, booking queries, or custom material delivery schedules.</p>
          <div className="cta-buttons">
            <a href="tel:03334746064" className="btn-gold btn-call">
              <Phone size={18} /> Call Now: 0333-4746064
            </a>
            <a href="#locations" className="btn-outline">Visit Our Depots</a>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-col">
            <Link to="/" className="footer-logo">
              <Building2 size={24} color="#b89047" />
              <span>Data Waley <span className="gold-accent">Cement</span></span>
            </Link>
            <p>
              Premium construction raw material distributor supplying cement, grade-60 steel rebars, 
              kiln-baked clay bricks, and quality aggregates across Punjab since 1978.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#products">Our Products</a></li>
              <li><a href="#about">Our Legacy</a></li>
              <li><a href="#locations">Depot Locations</a></li>
              <li><a href="#ceo-message">CEO Message</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Products</h4>
            <ul>
              <li><span>OPC & SRC Cement</span></li>
              <li><span>Grade-60 Steel Rebars</span></li>
              <li><span>Kailash baked clay Bricks</span></li>
              <li><span>Margalla & Sargodha Crush</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Contact Info</h4>
            <ul>
              <li><span><strong>Email:</strong> datawaleycement@gmail.com</span></li>
              <li><span><strong>Phone:</strong> 0333-4746064</span></li>
              <li><span><strong>Support:</strong> 0334-4294300</span></li>
              <li><span><strong>Office:</strong> Kot Abdul Malik, Lahore</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Data Waley Cement Depot. All rights reserved. Established 1978.</p>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">FB</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">IG</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LN</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">TW</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
