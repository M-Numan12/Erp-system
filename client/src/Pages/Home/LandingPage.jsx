import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  ChevronLeft,
  Send,
  Package
} from 'lucide-react';

const AnimatedCounter = ({ target, duration = 1500, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTimestamp = null;
          const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCount(Math.floor(easeProgress * target));
            if (progress < 1) {
              window.requestAnimationFrame(step);
            }
          };
          window.requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [target, duration]);

  return (
    <span ref={elementRef}>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

const ScrollReveal = ({ children, className = "", stagger = false, delay = 0 }) => {
  const [isActive, setIsActive] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsActive(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -80px 0px" }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`${stagger ? 'reveal-stagger' : 'reveal'} ${isActive ? 'active' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : {}}
    >
      {children}
    </div>
  );
};

const LandingPage = () => {
  // Scroll Position Tracking for Parallax Zoom
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Supply Projects Slider State
  const [activeProject, setActiveProject] = useState(0);
  const projects = [
    {
      title: "Lahore Motorway Expansion",
      category: "Infrastructure",
      image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80",
      description: "Supplying over 10,000 tons of grade-60 steel rebars and high-strength factory-direct cement for critical motorway infrastructure."
    },
    {
      title: "Gulberg Heights Tower",
      category: "Commercial",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      description: "Exclusive supplier of premium OPC cement and Margalla crush aggregates for heavy concrete foundations on a 20-story business tower."
    },
    {
      title: "DHA Phase-8 Luxury Villas",
      category: "Residential",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      description: "Prompt delivery of over 500,000 Awwal class baked clay bricks and screened river sand for premium residential masonry."
    }
  ];

  const nextProject = () => {
    setActiveProject((prev) => (prev + 1) % projects.length);
  };

  const prevProject = () => {
    setActiveProject((prev) => (prev - 1 + projects.length) % projects.length);
  };

  // Testimonials Data
  const testimonials = [
    {
      quote: "I've been working with Data Waley for over 15 years. Their cement quality is unmatched, and they never compromise on delivery timelines. A true partner in construction.",
      author: "Muhammad Aslam",
      designation: "Civil Contractor, Lahore"
    },
    {
      quote: "The steel sariya quality from Data Waley has been exceptional for our housing projects. Their pricing is competitive and they understand the needs of large-scale builders.",
      author: "Ahmed Khan",
      designation: "Builder & Developer"
    },
    {
      quote: "As a retailer, reliability is everything. Data Waley has never let us down. Their wholesale rates and consistent supply have helped grow our business tremendously.",
      author: "Rashid Mahmood",
      designation: "Retail Partner"
    },
    {
      quote: "From bricks to cement, Data Waley maintains the highest standards. Their prompt delivery and excellent customer relationship management make them our top choice.",
      author: "Zaheer Abbas",
      designation: "Construction Manager"
    }
  ];

  // Contact Form State
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }, 3000);
  };

  return (
    <div className="landing-container">
      {/* Background Aura Glimmers */}
      <div className="bg-aura gold"></div>
      <div className="bg-aura blue"></div>

      {/* 1. Navigation Header */}
      <header className="nav-header">
        <Link to="/" className="logo">
          <div className="logo-icon">
            <Building2 size={18} color="#000" />
          </div>
          <span>DATA WALEY <span className="gold-accent">CEMENT</span></span>
        </Link>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#services">Services</a>
          <a href="#locations">Locations</a>
          <a href="#portfolio">Supply History</a>
          <a href="#contact">Contact</a>
        </nav>

        <a href="#contact" className="btn-nav-outline">
          Request a Quote
        </a>
      </header>

      {/* 2. Hero Section */}
      <section id="home" className="hero-section">
        <div 
          className="hero-bg-image"
          style={{
            transform: `scale(${1 + scrollY * 0.0006}) translateY(${scrollY * 0.1}px)`,
            opacity: Math.max(0.15, 1 - scrollY * 0.0018)
          }}
        ></div>
        <div className="hero-content">
          <span className="hero-tag">ESTABLISHED 1978</span>
          <h1>
            BUILDING<br />
            LAHORE<br />
            <span className="gold-accent">SINCE 1978</span>
          </h1>
          <div className="hero-divider"></div>
          <p className="hero-desc">
            Your trusted partner for premium construction materials. Supplying high-grade cement, steel sariya, bricks, and aggregates to Punjab's landmark developments for over 46 years.
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
        <ScrollReveal stagger className="stats-grid">
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={50000} suffix="+" />
            </div>
            <div className="stat-label">Customers Served</div>
          </div>
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={250} suffix="+" />
            </div>
            <div className="stat-label">Retail Partners</div>
          </div>
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={46} suffix="+" />
            </div>
            <div className="stat-label">Years of Legacy</div>
          </div>
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={2} suffix="" />
            </div>
            <div className="stat-label">Retail Depots</div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. Vision Section */}
      <section id="about" className="vision-section">
        <ScrollReveal stagger className="vision-content">
          <h2 className="reveal-item">
            BUILDING A<br />
            STRONGER<br />
            <span className="gold-accent">PAKISTAN</span>
          </h2>
          <div className="vision-divider reveal-item"></div>
          <p className="reveal-item">
            Our vision extends beyond materials. We're committed to becoming Punjab's most trusted construction partner, 
            empowering builders, contractors, and retailers with uncompromising quality and unwavering reliability. 
            Every brick, every bag of cement, every steel rod carries our 46-year legacy of excellence.
          </p>
        </ScrollReveal>
      </section>

      {/* 5. Products Section */}
      <section id="products" className="products-section section-padding">
        <ScrollReveal className="section-header">
          <h2>PREMIUM <span className="gold-accent">CONSTRUCTION MATERIALS</span></h2>
          <p>We source and distribute only the highest-rated building materials from trusted national brands.</p>
        </ScrollReveal>

        <ScrollReveal stagger className="products-grid">
          {/* Cement Card */}
          <div className="product-card glass-card reveal-item">
            <div
              className="product-image"
              style={{ backgroundImage: `url('/cement.jpg')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Premium Cement</h3>
              </div>
              <p>
                Providing high-strength OPC and SRC cements suitable for heavy foundations, slabs, and all general construction work. Engineered for durability.
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
          <div className="product-card glass-card reveal-item">
            <div
              className="product-image"
              style={{ backgroundImage: `url('/steel.jpg')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Grade-60 Steel Sariya</h3>
              </div>
              <p>
                Deformed steel rebars featuring high yield strength, outstanding bendability, and excellent bond strength with concrete. Ideal for seismic areas.
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
          <div className="product-card glass-card reveal-item">
            <div
              className="product-image"
              style={{ backgroundImage: `url('/bricks.jpg')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Kailash Clay Bricks</h3>
              </div>
              <p>
                Premium clay bricks, thoroughly baked in traditional kilns. Offers rich red color, precise rectangular dimensions, and high compressive strength.
              </p>
              <div className="brand-badges">
                <span className="badge">Awwal (1st Class) Bricks</span>
                <span className="badge">Doyam (2nd Class) Bricks</span>
                <span className="badge">Special Selected Bricks</span>
              </div>
            </div>
          </div>

          {/* Aggregates Card */}
          <div className="product-card glass-card reveal-item">
            <div
              className="product-image"
              style={{ backgroundImage: `url('/aggregates.jpg')` }}
            ></div>
            <div className="product-info">
              <div className="product-icon-title">
                <Award size={24} color="#b89047" />
                <h3>Aggregates & Sand</h3>
              </div>
              <p>
                Sourced from Margalla and Sargodha hills. Clean river sand and washed bajri screened to ensure concrete strength and superior plaster finishes.
              </p>
              <div className="brand-badges">
                <span className="badge">Margalla Crush (A-Grade)</span>
                <span className="badge">Sargodha Crush</span>
                <span className="badge">Ravi Chenab Sand</span>
                <span className="badge">Fine Bajri</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 6. Supply History Section (Portfolio) */}
      <section id="portfolio" className="projects-section section-padding">
        <ScrollReveal className="section-header">
          <h2>OUR SUPPLY <span className="gold-accent">HISTORY</span></h2>
          <p>Explore some of the major projects supplied by Data Waley across Punjab.</p>
        </ScrollReveal>

        <ScrollReveal className="slider-wrapper">
          <div className="slider-container">
            <div className="project-slide-card glass-card">
              <div
                className="project-slide-image"
                style={{ backgroundImage: `url(${projects[activeProject].image})` }}
              >
                <span className="project-slide-badge">{projects[activeProject].category}</span>
              </div>
              <div className="project-slide-content">
                <h3>{projects[activeProject].title}</h3>
                <p>{projects[activeProject].description}</p>
                <div className="project-slide-footer">
                  <a href="#contact" className="project-link">
                    Explore Details <ArrowRight size={16} />
                  </a>
                  <div className="slider-controls">
                    <button onClick={prevProject} className="btn-slider-arrow">
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextProject} className="btn-slider-arrow">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="slider-indicators">
            {projects.map((_, index) => (
              <span
                key={index}
                className={`indicator-dot ${index === activeProject ? 'active' : ''}`}
                onClick={() => setActiveProject(index)}
              ></span>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* 6b. ERP Tech Operations Section */}
      <section className="tech-section section-padding">
        <ScrollReveal className="tech-container">
          <div className="tech-content reveal-item">
            <h2>
              POWERED BY<br />
              <span className="gold-accent">TECHNOLOGY.</span><br />
              DRIVEN BY<br />
              TRUST.
            </h2>
            <p className="tech-desc">
              Our modern ERP system ensures real time inventory tracking, automated order processing, and seamless logistics coordination. Technology meets tradition to deliver excellence.
            </p>
            <div className="tech-bullets">
              <div className="bullet">
                <CheckCircle2 size={20} color="#b89047" />
                <div className="bullet-text">
                  <span>Real-time Inventory Management</span>
                </div>
              </div>
              <div className="bullet">
                <CheckCircle2 size={20} color="#b89047" />
                <div className="bullet-text">
                  <span>Automated Order Processing</span>
                </div>
              </div>
              <div className="bullet">
                <CheckCircle2 size={20} color="#b89047" />
                <div className="bullet-text">
                  <span>Fleet Tracking & Logistics</span>
                </div>
              </div>
              <div className="bullet">
                <CheckCircle2 size={20} color="#b89047" />
                <div className="bullet-text">
                  <span>Customer Portal Access</span>
                </div>
              </div>
            </div>
          </div>
          <div className="tech-visual reveal-item">
            <img src="/dashboard_mockup.png" alt="ERP Dashboard Mockup" />
          </div>
        </ScrollReveal>
      </section>

      {/* 7. Services Section */}
      <section id="services" className="services-section section-padding">
        <ScrollReveal className="section-header">
          <h2>ERP POWERED <span className="gold-accent">LOGISTICS SERVICES</span></h2>
          <p>We leverage modern digital logistics technology to manage and deliver building materials seamlessly.</p>
        </ScrollReveal>
        <ScrollReveal stagger className="services-grid">
          <div className="service-card glass-card reveal-item">
            <div className="service-icon">
              <Building2 size={28} color="#b89047" />
            </div>
            <h3>Real-time Inventory</h3>
            <p>Our digital system ensures products marked in-stock are ready for immediate dispatch, avoiding project delays.</p>
          </div>
          <div className="service-card glass-card reveal-item">
            <div className="service-icon">
              <Warehouse size={28} color="#b89047" />
            </div>
            <h3>Automated Dispatch</h3>
            <p>Integrated fleet tracking ensures trucks are routed optimally to reach your building site on schedule within 24 hours.</p>
          </div>
          <div className="service-card glass-card reveal-item">
            <div className="service-icon">
              <Database size={28} color="#b89047" />
            </div>
            <h3>Digital Billing</h3>
            <p>Clear, error-free automated invoices, account statements, and loading receipts accessible instantly for absolute transparency.</p>
          </div>
        </ScrollReveal>
      </section>

      {/* 8. Depot Locations Section */}
      <section id="locations" className="locations-section section-padding">
        <ScrollReveal className="section-header">
          <h2>TWO DEPOTS. <span className="gold-accent">ONE HIGHEST STANDARD.</span></h2>
          <p>Visit our physical locations for order booking, stock inspection, or expert consultation.</p>
        </ScrollReveal>
        <ScrollReveal stagger className="locations-grid">
          {/* Main Location */}
          <div className="location-card glass-card reveal-item">
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
                <span><span className="info-label">Phone:</span> 0334-4294300</span>
              </div>
              <div className="detail-item">
                <Clock size={18} color="#b89047" style={{ marginTop: '3px' }} />
                <span><span className="info-label">Hours:</span> Mon - Sat: 8:00 AM - 8:00 PM</span>
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
          <div className="location-card glass-card reveal-item">
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
                <span><span className="info-label">Phone:</span> 0311-4105840</span>
              </div>
              <div className="detail-item">
                <Clock size={18} color="#b89047" style={{ marginTop: '3px' }} />
                <span><span className="info-label">Hours:</span> Mon - Sat: 8:00 AM - 8:00 PM</span>
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
        </ScrollReveal>
      </section>

      {/* 8. Supply & Logistics Section */}
      <section className="supply-section section-padding">
        <ScrollReveal className="supply-header">
          <h2>
            SUPPLY ACROSS<br />
            ALL OF <span className="gold-accent">PUNJAB</span>
          </h2>
        </ScrollReveal>
        
        <ScrollReveal className="supply-images-container">
          <div className="supply-img-wrapper">
            <img src="/truck1.jpg" alt="Truck driving in Punjab" className="supply-img" />
          </div>
          <div className="supply-img-wrapper">
            <img src="/truck2.jpg" alt="Traditional Pakistani truck" className="supply-img" />
          </div>
        </ScrollReveal>

        <ScrollReveal stagger className="supply-cards-grid">
          <div className="supply-card glass-card reveal-item">
            <div className="supply-icon">
              <Truck size={28} color="#b89047" />
            </div>
            <h3>Fleet Logistics</h3>
            <p>Modern fleet ensuring timely deliveries across Punjab</p>
          </div>
          
          <div className="supply-card glass-card reveal-item">
            <div className="supply-icon">
              <Package size={28} color="#b89047" />
            </div>
            <h3>Bulk Orders</h3>
            <p>Competitive pricing for large-scale wholesale orders</p>
          </div>
          
          <div className="supply-card glass-card reveal-item">
            <div className="supply-icon">
              <Building2 size={28} color="#b89047" />
            </div>
            <h3>Distribution Network</h3>
            <p>Strategic partnerships with 250+ retailers</p>
          </div>
        </ScrollReveal>
      </section>

      {/* 9. Testimonials Section */}
      <section className="testimonials-section section-padding">
        <ScrollReveal className="test-header">
          <h2>
            TRUSTED BY BUILDERS<br />
            ACROSS <span className="gold-accent">LAHORE</span>
          </h2>
        </ScrollReveal>
        
        <div className="marquee-wrapper">
          <div className="marquee-track">
            {[...testimonials, ...testimonials].map((t, idx) => (
              <div key={idx} className="test-card glass-card marquee-item">
                <div className="stars">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#b89047" color="#b89047" />)}
                </div>
                <p className="quote">"{t.quote}"</p>
                <div className="client-info">
                  <h4>{t.author}</h4>
                  <p className="gold-accent">{t.designation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9b. CEO Message Section */}
      <section className="ceo-section section-padding">
        <ScrollReveal className="ceo-container">
          <div className="ceo-photo">
            <img src="/ceo.jpg" alt="Mian Hassam Ahmad, CEO" />
            <div className="ceo-badge">
              <svg viewBox="0 0 100 100">
                <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="none" />
                <text font-size="8.2" font-weight="900" fill="#b89047" letter-spacing="1">
                  <textPath href="#circlePath">
                    DATA ESTABLISHED 1978 • DATA ESTABLISHED 1978 •
                  </textPath>
                </text>
              </svg>
              <div className="badge-center">
                <span className="years">46+</span>
                <span className="label">YRS</span>
              </div>
            </div>
          </div>
          
          <div className="ceo-content">
            <span className="ceo-tag">From The CEO</span>
            <h2>
              BUILDING TRUST.<br />
              <span className="gold-accent">DELIVERING EXCELLENCE.</span>
            </h2>
            
            <p>
              Since 1978, Data Waley Cement Depot has been built on a simple promise: provide quality materials, honest service, and dependable support to every customer we serve.
            </p>
            <p>
              Over the decades, we have grown from a single depot into a trusted supplier serving thousands of builders, contractors, retailers, and homeowners across Punjab. While our scale has expanded, our values remain unchanged.
            </p>
            <p>
              Every order, every delivery, and every relationship is guided by integrity, reliability, and a commitment to excellence. We believe that strong communities are built on strong foundations, and we are proud to contribute to the projects that shape our cities and our future.
            </p>
            <p>
              Thank you for placing your trust in us. We look forward to serving the next generation of builders with the same dedication that has defined us for more than four decades.
            </p>
            
            <div className="ceo-signature-block">
              <p className="signature">Mian Hassam Ahmad</p>
              <div className="ceo-meta">
                <p className="ceo-name">Mian Hassam Ahmad</p>
                <p className="ceo-title">Chief Executive Officer · Data Waley Cement Depot</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 10. Contact & Form Section */}
      <section id="contact" className="contact-section section-padding">
        <ScrollReveal className="section-header">
          <h2>GET IN <span className="gold-accent">TOUCH</span></h2>
          <p>Contact our sales desk today for bulk rates, booking queries, or custom material delivery schedules.</p>
        </ScrollReveal>
        <div className="contact-container">
          <ScrollReveal className="contact-info-col reveal-item">
            <h3>Contact Details</h3>
            <p>Reach out directly to our customer sales desk or visit us for detailed project discussions.</p>
            
            <div className="info-list">
              <div className="info-item">
                <MapPin size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Our Depot Location</h4>
                  <p>Kot Abdul Malik, Near Motorway Interchange, Lahore, Punjab</p>
                </div>
              </div>
              <div className="info-item">
                <Phone size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Call Us</h4>
                  <p>0333-4746064 (Main Office)</p>
                </div>
              </div>
              <div className="info-item">
                <Mail size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Email Support</h4>
                  <p>datawaleycement@gmail.com</p>
                </div>
              </div>
              <div className="info-item">
                <Clock size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Business Hours</h4>
                  <p>Mon - Sat: 8:00 AM - 8:00 PM</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="contact-form-col reveal-item">
            <form onSubmit={handleSubmit} className="contact-form glass-card">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Mian Aslam"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. aslam@gmail.com"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. 0333-5556667"
                />
              </div>
              <div className="form-group">
                <label>Message Details</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  placeholder="Tell us about your structural material requirements..."
                ></textarea>
              </div>
              <button type="submit" className="btn-gold btn-submit">
                {formSubmitted ? 'Message Sent!' : 'Send Message'} <Send size={18} />
              </button>
            </form>
          </ScrollReveal>
        </div>
      </section>

      {/* 11. Footer Section */}
      <footer className="footer-section section-padding">
        <div className="footer-grid">
          <div className="footer-col">
            <Link to="/" className="footer-logo">
              <div className="logo-icon">
                <Building2 size={16} color="#000" />
              </div>
              <span>DATA WALEY <span className="gold-accent">CEMENT</span></span>
            </Link>
            <p>
              Premium construction raw material distributor supplying cement, grade-60 steel rebars, kiln-baked clay bricks, and quality aggregates across Punjab since 1978.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#products">Products</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#locations">Locations</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Premium Materials</h4>
            <ul>
              <li><span>OPC & SRC Cement</span></li>
              <li><span>Grade-60 Steel Rebars</span></li>
              <li><span>Kailash Baked Clay Bricks</span></li>
              <li><span>Aggregates & Sand</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Newsletter</h4>
            <p>Subscribe to receive our latest product price sheets and supply updates.</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Your Email Address" required />
              <button type="submit">Subscribe</button>
            </form>
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
      <div className="portal-buttons">
        <Link to="/login" className="btn-portal-user">Staff Portal</Link>
      </div>
    </div>
  );
};

export default LandingPage;
