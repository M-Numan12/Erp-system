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
  Send
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
  // Projects Slider State
  const [activeProject, setActiveProject] = useState(0);
  const projects = [
    {
      title: "The Falcon Tower",
      category: "Commercial",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
      description: "A 45-story luxury business hub in the heart of Islamabad, featuring state-of-the-art infrastructure and eco-friendly design."
    },
    {
      title: "Marina Residences",
      category: "Residential",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      description: "A premium waterfront residential development offering modern apartments, smart home integration, and world-class amenities."
    },
    {
      title: "Centaurus Vista",
      category: "Mixed-Use",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      description: "A modern complex merging retail, corporate offices, and premium penthouses in Lahore's elite commercial district."
    }
  ];

  const nextProject = () => {
    setActiveProject((prev) => (prev + 1) % projects.length);
  };

  const prevProject = () => {
    setActiveProject((prev) => (prev - 1 + projects.length) % projects.length);
  };

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
            <Building2 size={20} color="#000" />
          </div>
          <span>FALCON <span className="gold-accent">DEVELOPERS</span></span>
        </Link>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#services">Services</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#contact">Contact</a>
        </nav>

        <a href="#contact" className="btn-nav-outline">
          Get in Touch
        </a>
      </header>

      {/* 2. Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <span className="hero-tag">ESTABLISHED 1978</span>
          <h1>
            BUILDING A<br />
            STRONGER<br />
            <span className="gold-accent">PAKISTAN</span>
          </h1>
          <div className="hero-divider"></div>
          <p className="hero-desc">
            We are Pakistan's premier construction and materials partner, delivering high-grade steel, cement, and engineering solutions to build a modern nation.
          </p>
          <div className="hero-ctas">
            <a href="#products" className="btn-gold">
              Explore Products <ArrowRight size={18} />
            </a>
            <a href="#about" className="btn-outline">Learn More</a>
          </div>
        </div>
      </section>

      {/* 3. Statistics Section */}
      <section className="stats-section section-padding">
        <ScrollReveal stagger className="stats-grid">
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={46} suffix="+" />
            </div>
            <div className="stat-label">Years of Experience</div>
          </div>
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={250} suffix="+" />
            </div>
            <div className="stat-label">Completed Projects</div>
          </div>
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={50000} suffix="+" />
            </div>
            <div className="stat-label">Tons of Steel Delivered</div>
          </div>
          <div className="stat-card glass-card reveal-item">
            <div className="stat-num">
              <AnimatedCounter target={4.8} suffix="" />
            </div>
            <div className="stat-label">Customer Rating</div>
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
          <h2>PREMIUM <span className="gold-accent">MATERIALS</span></h2>
          <p>Every product we supply meets the highest standards of quality and durability.</p>
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
                <h3>High-Grade Cement</h3>
              </div>
              <p>
                Our premium cement ensures maximum bonding strength and longevity, ideal for structural foundations and high-rise developments.
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
                <h3>Deformed Steel Bars</h3>
              </div>
              <p>
                Engineered for high tensile strength and seismic resistance, our grade 60 steel rebars provide unmatched durability.
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
                <h3>Premium Clay Bricks</h3>
              </div>
              <p>
                Thoroughly baked clay bricks featuring precise rectangular dimensions and high compressive strength for premium masonry.
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
                <h3>Sand & Aggregates</h3>
              </div>
              <p>
                Clean, graded sand and bajri sourced from premium quarries, perfect for concrete, plastering, and foundational work.
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

      {/* 6. Latest Projects Section (Portfolio) */}
      <section id="portfolio" className="projects-section section-padding">
        <ScrollReveal className="section-header">
          <h2>OUR LATEST <span className="gold-accent">PROJECTS</span></h2>
          <p>Explore some of our landmark structural achievements across Pakistan.</p>
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
                    Explore Project <ArrowRight size={16} />
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

      {/* 7. Services Section */}
      <section id="services" className="services-section section-padding">
        <ScrollReveal className="section-header">
          <h2>OUR COMPREHENSIVE <span className="gold-accent">SERVICES</span></h2>
          <p>We deliver exceptional craftsmanship and structural guidance across all construction lifecycle stages.</p>
        </ScrollReveal>
        <ScrollReveal stagger className="services-grid">
          <div className="service-card glass-card reveal-item">
            <div className="service-icon">
              <Building2 size={28} color="#b89047" />
            </div>
            <h3>General Contracting</h3>
            <p>From groundbreaking to final handover, we manage all phases of construction with expert execution and strict quality control.</p>
          </div>
          <div className="service-card glass-card reveal-item">
            <div className="service-icon">
              <Warehouse size={28} color="#b89047" />
            </div>
            <h3>Architectural Design</h3>
            <p>Our design team creates innovative, functional, and aesthetically stunning spaces tailored to modern lifestyle and business needs.</p>
          </div>
          <div className="service-card glass-card reveal-item">
            <div className="service-icon">
              <Database size={28} color="#b89047" />
            </div>
            <h3>Civil Engineering</h3>
            <p>Delivering robust engineering solutions, site analysis, and structural designs that stand the test of time and environmental factors.</p>
          </div>
        </ScrollReveal>
      </section>

      {/* 8. Testimonials Section */}
      <section className="testimonials-section section-padding">
        <ScrollReveal className="test-header">
          <h2>WHAT OUR CLIENTS <span className="gold-accent">SAY</span></h2>
        </ScrollReveal>
        <ScrollReveal className="testimonials-container">
          <div className="test-card glass-card single-testimonial">
            <div className="stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="#b89047" color="#b89047" />)}
            </div>
            <p className="quote">
              "Working with Falcon Developers was a seamless experience. Their attention to detail, quality of construction materials, and adherence to timelines surpassed our expectations."
            </p>
            <div className="client-info">
              <h4>M. ARSHAD KHAN</h4>
              <p className="gold-accent">CEO, Al-Habib Enterprises</p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 9. Contact & Form Section */}
      <section id="contact" className="contact-section section-padding">
        <ScrollReveal className="section-header">
          <h2>GET IN <span className="gold-accent">TOUCH</span></h2>
          <p>Have an upcoming project? Let's build it together with strength and distinction.</p>
        </ScrollReveal>
        <div className="contact-container">
          <ScrollReveal className="contact-info-col reveal-item">
            <h3>Contact Details</h3>
            <p>Reach out directly to our customer sales desk or visit us for detailed project discussions.</p>
            
            <div className="info-list">
              <div className="info-item">
                <MapPin size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Our Address</h4>
                  <p>Plot 14, Mauve Area, G-8/1, Islamabad, Pakistan</p>
                </div>
              </div>
              <div className="info-item">
                <Phone size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Call Us</h4>
                  <p>+92 (51) 111-FALCON</p>
                </div>
              </div>
              <div className="info-item">
                <Mail size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Email Support</h4>
                  <p>info@falcondevelopers.com</p>
                </div>
              </div>
              <div className="info-item">
                <Clock size={24} color="#b89047" />
                <div className="item-details">
                  <h4>Business Hours</h4>
                  <p>Mon - Sat: 9:00 AM - 6:00 PM</p>
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
                  placeholder="e.g. Arshad Khan"
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
                  placeholder="e.g. arshad@gmail.com"
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
                  placeholder="Tell us about your requirements..."
                ></textarea>
              </div>
              <button type="submit" className="btn-gold btn-submit">
                {formSubmitted ? 'Message Sent!' : 'Send Message'} <Send size={18} />
              </button>
            </form>
          </ScrollReveal>
        </div>
      </section>

      {/* 10. Footer Section */}
      <footer className="footer-section section-padding">
        <div className="footer-grid">
          <div className="footer-col">
            <Link to="/" className="footer-logo">
              <div className="logo-icon">
                <Building2 size={16} color="#000" />
              </div>
              <span>FALCON <span className="gold-accent">DEVELOPERS</span></span>
            </Link>
            <p>
              Pakistan's premier construction raw material distributor and civil contracting firm. Building a stronger nation since 1978.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#products">Products</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#portfolio">Our Portfolio</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Premium Materials</h4>
            <ul>
              <li><span>High-Grade Cement</span></li>
              <li><span>Deformed Steel Bars</span></li>
              <li><span>Premium Clay Bricks</span></li>
              <li><span>Sand & Aggregates</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Newsletter</h4>
            <p>Subscribe to receive our latest project news and updates.</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Your Email Address" required />
              <button type="submit">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Falcon Developers. All rights reserved. Established 1978.</p>
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
