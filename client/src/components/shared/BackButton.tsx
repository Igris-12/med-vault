import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string; // explicit route; falls back to browser history
}

export function BackButton({ to }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      title="Go back"
      className="btn-ghost"
      style={{
        width: 34, height: 34,
        padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10,
        flexShrink: 0,
      }}
    >
      <ArrowLeft size={16} />
    </motion.button>
  );
}

