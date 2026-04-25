import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

interface TrailItem {
  id: number;
  x: number;
  y: number;
  opacity: number;
}

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [smoothPos, setSmoothPos] = useState({ x: -100, y: -100 });
  const [variant, setVariant] = useState<'default' | 'button' | 'card'>('default');
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const animRef = useRef<number>(0);
  const posRef = useRef({ x: -100, y: -100 });
  const smoothRef = useRef({ x: -100, y: -100 });
  const trailIdRef = useRef(0);
  const lastTrailTime = useRef(0);

  // Hide on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) return null;

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setIsVisible(true);

      // Trail: add a point every 40ms
      const now = Date.now();
      if (now - lastTrailTime.current > 40) {
        lastTrailTime.current = now;
        const id = ++trailIdRef.current;
        setTrail(prev => {
          const next = [...prev, { id, x: e.clientX, y: e.clientY, opacity: 0.35 }];
          return next.slice(-8);
        });
      }

      // Detect hovered element type
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const tag = el.tagName.toLowerCase();
        const isBtn = el.closest('button') || el.closest('a') || el.closest('[data-cursor="button"]');
        const isCard = el.closest('[data-cursor="card"]');
        if (isBtn) setVariant('button');
        else if (isCard) setVariant('card');
        else setVariant('default');
        void tag;
      }
    };

    const onClick = (e: MouseEvent) => {
      const id = Date.now();
      setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 700);
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('click', onClick);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth follow loop
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const loop = () => {
      smoothRef.current = {
        x: lerp(smoothRef.current.x, posRef.current.x, 0.12),
        y: lerp(smoothRef.current.y, posRef.current.y, 0.12),
      };
      setSmoothPos({ ...smoothRef.current });
      setPos({ ...posRef.current });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('click', onClick);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const cursorSize = variant === 'button' ? 48 : variant === 'card' ? 40 : 14;
  const ringSize = variant === 'button' ? 64 : variant === 'card' ? 56 : 36;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]" style={{ cursor: 'none' }}>
      {/* Trail dots */}
      {isVisible && trail.map((t, i) => (
        <div
          key={t.id}
          className="absolute rounded-full bg-wa-green"
          style={{
            left: t.x - 3,
            top: t.y - 3,
            width: 6,
            height: 6,
            opacity: (i / trail.length) * 0.3,
            transition: 'opacity 0.4s ease',
            transform: 'translate(-0%,-0%)',
          }}
        />
      ))}

      {/* Outer ring (smooth) */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="absolute rounded-full border-2 border-wa-green"
            style={{
              left: smoothPos.x - ringSize / 2,
              top: smoothPos.y - ringSize / 2,
              width: ringSize,
              height: ringSize,
              opacity: variant === 'card' ? 0.9 : 0.5,
              boxShadow: '0 0 16px rgba(34,197,94,0.4)',
            }}
            animate={{
              scale: variant === 'button' ? 1.2 : 1,
              opacity: variant === 'card' ? 0.9 : 0.5,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        )}
      </AnimatePresence>

      {/* Inner dot (sharp follow) */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="absolute rounded-full bg-wa-green"
            style={{
              left: pos.x - cursorSize / 2,
              top: pos.y - cursorSize / 2,
              width: cursorSize,
              height: cursorSize,
              boxShadow: '0 0 12px rgba(34,197,94,0.8), 0 0 24px rgba(34,197,94,0.4)',
            }}
            animate={{ scale: variant === 'button' ? 0.5 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          />
        )}
      </AnimatePresence>

      {/* Click ripples */}
      {ripples.map(r => (
        <motion.div
          key={r.id}
          className="absolute rounded-full border-2 border-wa-green"
          style={{ left: r.x - 20, top: r.y - 20, width: 40, height: 40 }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
