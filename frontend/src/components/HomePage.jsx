import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

function HomePage() {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isHappyHour, setIsHappyHour] = useState(false);
  const [activeGameFilter, setActiveGameFilter] = useState('All');

  // Updated games data with image paths
  const games = [
    { 
      id: 1, 
      title: 'SmackDown: Here Comes The Pain', 
      platform: 'PS2', 
      category: 'Action', 
      tag: 'Popular', 
      cover: '/images/games/HCTP.jpg',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=SmackDown'
    },
    { 
      id: 2, 
      title: 'Grand Theft Auto: San Andreas', 
      platform: 'PS2', 
      category: 'Open World', 
      tag: 'Classic', 
      cover: '/images/games/GTA SA.jpg',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=GTA'
    },
    { 
      id: 3, 
      title: 'Urban Reign', 
      platform: 'PS2', 
      category: 'Fight', 
      tag: 'Multiplayer', 
      cover: '/images/games/Urban Reign.jpg',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=FIFA+2005'
    },
    { 
      id: 4, 
      title: 'God Hand', 
      platform: 'PS2', 
      category: 'Fighting', 
      tag: 'Popular', 
      cover: '/images/games/God Hand.jpg',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=Tekken+3'
    },
    { 
      id: 5, 
      title: 'Need for Speed: Most Wanted', 
      platform: 'PS2', 
      category: 'Racing', 
      tag: 'Classic', 
      cover: '/images/games/Need for Speed.webp',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=Crash+Bandicoot'
    },
    { 
      id: 6, 
      title: 'Fifa 14', 
      platform: 'PS2', 
      category: 'Sports', 
      tag: 'Popular', 
      cover: '/images/games/fifa 14.jpg',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=Guitar+Hero'
    },
    { 
      id: 7, 
      title: 'Brian Lara Cricket: 2007', 
      platform: 'PS2', 
      category: 'Sports', 
      tag: 'Classic', 
      cover: '/images/games/Brian Lara.jpg',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=Need+for+Speed'
    },
    { 
      id: 8, 
      title: 'God of War', 
      platform: 'PS2', 
      category: 'Action', 
      tag: 'Popular', 
      cover: '/images/games/gow.jpg',
      fallbackImage: 'https://via.placeholder.com/200x280/1a1a2e/16213e?text=Medal+of+Honor'
    }
  ];

  const gameCategories = ['All', 'Action', 'Sports', 'Fighting', 'Adventure', 'Music', 'Racing'];

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check if it's happy hour (1 PM to 5 PM, Monday to Saturday)
      const day = now.getDay();
      const hour = now.getHours();
      const isWeekday = day >= 1 && day <= 6;
      const isHappyHourTime = hour >= 13 && hour < 17;
      
      setIsHappyHour(isWeekday && isHappyHourTime);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const filteredGames = activeGameFilter === 'All' 
    ? games 
    : games.filter(game => game.category === activeGameFilter);

  const handleBookNow = () => {
    window.open('https://wa.me/9373094008?text=Hi! I want to book a gaming slot at L1R1 GameZonia', '_blank');
  };

  const handleWhatsAppChat = () => {
    window.open('https://wa.me/9373094008?text=Hi! I have a question about L1R1 GameZonia', '_blank');
  };

  // Component for game image with fallback
  const GameImage = ({ game, className }) => {
    const [imageSrc, setImageSrc] = useState(game.cover);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageError = () => {
      setImageSrc(game.fallbackImage);
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
    };

    return (
      <div className={`game-cover ${className}`}>
        <img
          src={imageSrc}
          alt={`${game.title} cover`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className={`game-image ${imageLoaded ? 'loaded' : 'loading'}`}
        />
        {!imageLoaded && (
          <div className="game-image-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="homepage-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-logo">
          <div className="logo-section">
            <h1 className="logo-text">🎮 L1R1 GameZonia</h1>
          </div>
        </div>
        <ul className="nav-links">
          <li><a href="#home" className="nav-link active">Home</a></li>
          <li><a href="#consoles" className="nav-link">Consoles</a></li>
          <li><a href="#games" className="nav-link">Games</a></li>
          <li><a href="#pricing" className="nav-link">Pricing</a></li>
          <li><a href="#contact" className="nav-link">Contact</a></li>
          <li>
            <button className="nav-cta" onClick={handleBookNow}>
              📅 Book a Slot
            </button>
          </li>
        </ul>
      </nav>

      {/* Animated background elements */}
      <div className="background-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
        <div className="shape shape-5"></div>
        <div className="shape shape-6"></div>
      </div>

      {/* Hero Section */}
      <header className="hero-section" id="home">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to L1R1 GameZonia</h1>
          <p className="hero-subtitle">Where Every Gamepad Tells a Story</p>
          <div className="hero-badges">
            <span className="hero-badge ps2">PS2 Available Now</span>
            <span className="hero-badge ps4">PS4 Launching Soon!</span>
          </div>
          <div className="hero-buttons">
            <button className="hero-btn primary" onClick={handleBookNow}>
              🔵 Book Now
            </button>
            <button className="hero-btn secondary" onClick={() => document.getElementById('games').scrollIntoView()}>
              🟡 View Game Library
            </button>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-icon">🕒</span>
          <span>Current Time: {formatTime(currentTime)} IST</span>
        </div>
        <div className={`status-item ${isHappyHour ? 'happy-hour-active' : 'happy-hour-inactive'}`}>
          <span className="status-icon">{isHappyHour ? '🎉' : '⏰'}</span>
          <span>{isHappyHour ? 'Happy Hour ACTIVE! 20% OFF!' : 'Happy Hour: 1PM-5PM Mon-Sat'}</span>
        </div>
      </div>

      {/* Consoles Section */}
      <section className="consoles-section" id="consoles">
        <div className="section-header">
          <h2>Gaming Consoles</h2>
          <p>Experience the best of retro and modern gaming</p>
        </div>
        <div className="consoles-grid">
          <div className="console-card available">
            <div className="console-badge available-badge">✅ Available</div>
            <div className="console-icon">🎮</div>
            <h3>PlayStation 2</h3>
            <div className="console-details">
              <div className="detail-item">
                <span className="detail-label">Price:</span>
                <span className="detail-value">₹60/hour</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Controllers:</span>
                <span className="detail-value">2 available</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Games:</span>
                <span className="detail-value">50+ titles</span>
              </div>
            </div>
            <button className="console-btn" onClick={handleBookNow}>
              Book PS2 Session
            </button>
          </div>

          <div className="console-card coming-soon">
            <div className="console-badge coming-soon-badge">🚧 Coming Soon</div>
            <div className="console-icon">🎮</div>
            <h3>PlayStation 4</h3>
            <div className="console-details">
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value">Launching this month!</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Features:</span>
                <span className="detail-value">HD Gaming</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Updates:</span>
                <span className="detail-value">Follow us for news</span>
              </div>
            </div>
            <button className="console-btn disabled" disabled>
              Coming Soon
            </button>
          </div>
        </div>
      </section>

      {/* Game Library Section */}
      <section className="games-section" id="games">
        <div className="section-header">
          <h2>Game Library</h2>
          <p>Explore our collection of amazing games</p>
        </div>
        
        <div className="game-filters">
          {gameCategories.map(category => (
            <button
              key={category}
              className={`filter-btn ${activeGameFilter === category ? 'active' : ''}`}
              onClick={() => setActiveGameFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="games-grid">
          {filteredGames.map(game => (
            <div key={game.id} className="game-card">
              <GameImage game={game} className="game-cover" />
              <div className="game-info">
                <h4 className="game-title">{game.title}</h4>
                <div className="game-meta">
                  <span className="game-platform">{game.platform}</span>
                  <span className={`game-tag ${game.tag.toLowerCase()}`}>
                    {game.tag}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" id="pricing">
        <div className="section-header">
          <h2>Pricing & Happy Hours</h2>
          <p>Affordable gaming with special discounts</p>
        </div>
        
        <div className="pricing-container">
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Happy Hours</h3>
              <div className="console-status happy-hour">1:00 PM - 5:00 PM (Mon-Sat)</div>
            </div>
            <div className="pricing-table">
              <div className="price-row">
                <span className="duration">2 Players</span>
                <span className="price">₹40</span>
              </div>
            </div>
          </div>

          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Regular Hours</h3>
              <div className="console-status available">5:00 PM - 12:00 AM</div>
            </div>
            <div className="pricing-table">
              <div className="price-row">
                <span className="duration">1 Player - 30 minutes</span>
                <span className="price">₹20</span>
              </div>
              <div className="price-row">
                <span className="duration">1 Player - 1 hour</span>
                <span className="price">₹30</span>
              </div>
              <div className="price-row">
                <span className="duration">2 Players - 30 minutes</span>
                <span className="price">₹40</span>
              </div>
              <div className="price-row">
                <span className="duration">2 Players - 1 hour</span>
                <span className="price">₹60</span>
              </div>
            </div>
          </div>

          <div className="pricing-card">
            <div className="pricing-header">
              <h3>PlayStation 4</h3>
              <div className="console-status coming-soon">Coming Soon</div>
            </div>
            <div className="coming-soon-content">
              <div className="coming-soon-icon">🚀</div>
              <p>Get ready for next-gen gaming!</p>
              <p>Pricing will be announced soon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Banner */}
      <section className="coming-soon-banner">
        <div className="banner-content">
          <h2>🚀 PS4 IS COMING TO L1R1 GameZonia!</h2>
          <p>Be the first to play when it launches. Stay tuned for updates!</p>
          <button className="banner-btn" onClick={handleWhatsAppChat}>
            Get Notified
          </button>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section" id="contact">
        <div className="section-header">
          <h2>Get In Touch</h2>
          <p>Visit us or reach out anytime</p>
        </div>
        
        <div className="contact-grid">
          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-icon">📍</div>
              <div className="contact-details">
                <h4>Location</h4>
                <p>opp. Bharat Petroleum Petrol Pump, near Shriram Chowk, Vasita Colony, Ulhasnagar, Maharashtra 421004</p>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">📞</div>
              <div className="contact-details">
                <h4>Phone</h4>
                <p>+91 9373094008 / +91 9175446306</p>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">📱</div>
              <div className="contact-details">
                <h4>WhatsApp</h4>
                <button className="whatsapp-btn" onClick={handleWhatsAppChat}>
                  Chat with us
                </button>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">🕒</div>
              <div className="contact-details">
                <h4>Hours</h4>
                <p>Daily: 12:00 PM - 12:00 AM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="cta-content">
          <h2>🎮 Ready to Start Your Game?</h2>
          <p>Book a slot now and enjoy the retro + next-gen experience!</p>
          <button className="cta-button final" onClick={handleBookNow}>
            <span>Book Now</span>
            <span className="button-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>🎮 L1R1 GameZonia</h3>
            <p>Where Every Gamepad Tells a Story</p>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#consoles">Consoles</a></li>
              <li><a href="#games">Games</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Connect</h4>
            <div className="social-links">
              <a href="https://www.instagram.com/l1r1.gamezonia/" className="social-link">📱 Instagram</a>
              <a href="#" className="social-link" onClick={handleWhatsAppChat}>💬 WhatsApp</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 L1R1 GameZonia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;