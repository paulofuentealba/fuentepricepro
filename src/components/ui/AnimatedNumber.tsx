import { useEffect, useRef } from "react";
import { useInView, useSpring, useTransform, motion, useMotionValue } from "framer-motion";
import { formatNumber, type Locale } from "@/lib/formatters";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delay?: number;
  className?: string;
  /** Locale used by the default (non-`format`) number formatting. Defaults to "ptBR". */
  locale?: Locale;
}

export function AnimatedNumber({
  value,
  format,
  prefix = "",
  suffix = "",
  decimals = 0,
  delay = 0,
  className,
  locale = "ptBR",
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const motionValue = useMotionValue(value);

  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        motionValue.set(value);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      motionValue.set(value);
    }
  }, [inView, value, motionValue, delay]);

  const display = useTransform(springValue, (latest) => {
    if (format) {
      return format(latest);
    }
    return prefix + formatNumber(latest, locale, decimals) + suffix;
  });

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
