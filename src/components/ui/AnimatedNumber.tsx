import { useEffect, useRef } from "react";
import { useInView, useSpring, useTransform, motion, useMotionValue } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  format,
  prefix = "",
  suffix = "",
  decimals = 0,
  delay = 0,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);

  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });

  useEffect(() => {
    if (inView) {
      setTimeout(() => {
        motionValue.set(value);
      }, delay);
    }
  }, [inView, value, motionValue, delay]);

  const display = useTransform(springValue, (latest) => {
    if (format) {
      return format(latest);
    }
    return (
      prefix +
      Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(latest) +
      suffix
    );
  });

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
