import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      if (mounted) setReduced(value);
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

export function useScreenReader() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then(value => {
      if (mounted) setEnabled(value);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', value => {
      if (mounted) setEnabled(value);
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return enabled;
}

export function announce(message, delayMs = 200) {
  if (!message) return;
  setTimeout(() => {
    AccessibilityInfo.announceForAccessibility(String(message));
  }, delayMs);
}
