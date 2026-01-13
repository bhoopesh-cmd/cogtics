import React from 'react';
import { motion } from 'framer-motion';

interface DecorativeDotsProps {
  variant?: 'grid' | 'vertical' | 'horizontal';
  className?: string;
}

const DecorativeDots: React.FC<DecorativeDotsProps> = ({ variant = 'grid', className = '' }) => {
  const config = {
    grid: { rows: 6, cols: 8, gap: 5 },
    vertical: { rows: 12, cols: 3, gap: 5 },
    horizontal: { rows: 3, cols: 12, gap: 5 }
  }[variant];

  return (
    <div className={`pointer-events-none z-0 absolute ${className}`} aria-hidden="true">
        <div 
          className="grid"
          style={{ 
            gridTemplateColumns: `repeat(${config.cols}, min-content)`,
            gap: `${config.gap * 6}px`
          }}
        >
          {Array.from({ length: config.rows * config.cols }).map((_, i) => {
            const isAccent = Math.random() > 0.85;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: isAccent ? [0.6, 1, 0.6] : [0.1, 0.5, 0.1] }}
                viewport={{ once: false }}
                transition={{ 
                  duration: Math.random() * 3 + 2, 
                  repeat: Infinity, 
                  delay: Math.random() * 2,
                  ease: "easeInOut"
                }}
                className={`w-2.5 h-2.5 rounded-full ${isAccent ? 'bg-[#ff6500]' : 'bg-zinc-300'}`}
              />
            );
          })}
        </div>
    </div>
  );
};

export default DecorativeDots;

