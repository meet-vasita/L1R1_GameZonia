import React, { useState, useEffect } from 'react';
import '../styles/ConsoleManagement.css';

const RealTimeClock = ({ onTimeUpdate }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (onTimeUpdate) onTimeUpdate(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [onTimeUpdate]);

  return (
    <div className="real-time-clock">
      Current Time: {currentTime.toLocaleTimeString('en-IN', { hour12: true, timeZone: 'Asia/Kolkata' })}
    </div>
  );
};

export default RealTimeClock;