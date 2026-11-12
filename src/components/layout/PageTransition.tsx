import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      data-testid="page-transition"
      className="flex flex-col flex-grow w-full"
    >
      {children}
    </motion.div>
  );
}
