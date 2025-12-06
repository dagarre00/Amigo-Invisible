import React from 'react';

export const Snowfall: React.FC = () => {
  // Create a static array of snowflakes to render
  const snowflakes = Array.from({ length: 20 }).map((_, i) => ({
    left: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 3 + 5}s`,
    animationDelay: `${Math.random() * 5}s`,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {snowflakes.map((s, i) => (
        <div 
          key={i} 
          className="snowflake text-white/20"
          style={{ 
            left: s.left, 
            animationDuration: s.animationDuration, 
            animationDelay: s.animationDelay 
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
};