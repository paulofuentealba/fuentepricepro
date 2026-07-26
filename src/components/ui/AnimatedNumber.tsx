import { useEffect, useRef } from "react";
import { useInView, useSpring, useMotionValue } from "framer-motion";

export function AnimatedNumber({ 
  value, 
  prefix = "", 
  suffix = "", 
  decimals = 0, 
  delay = 0 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  decimals?: number; 
  delay?: number; 
}) {
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

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = 
          prefix + 
          Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(latest) + 
          suffix;
      }
    });
  }, [springValue, prefix, suffix, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(0)}
      {suffix}
    </span>
  );
}
