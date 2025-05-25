import { useState, useEffect } from 'react';

/**
 * A hook to detect if the current device is a mobile device.
 * This is determined by checking the user agent string and screen width.
 * @returns {boolean} True if the current device is a mobile device
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Function to check if the device is mobile
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = [
        'android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'
      ];
      
      const isMobileUserAgent = mobileKeywords.some(keyword => 
        userAgent.includes(keyword)
      );
      
      // Also check for small screen size (typical for mobile devices)
      const isMobileScreenSize = window.innerWidth < 768;
      
      // Either a mobile user agent OR a small screen is considered a mobile device
      setIsMobile(isMobileUserAgent || isMobileScreenSize);
    };
    
    // Check on mount
    checkIsMobile();
    
    // Re-check on resize
    window.addEventListener('resize', checkIsMobile);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}

/**
 * A hook to detect if the device supports touch events.
 * @returns {boolean} True if the device supports touch events
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if the device supports touch events
    setIsTouch(
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 || 
      // @ts-ignore - MS specific property
      navigator.msMaxTouchPoints > 0
    );
  }, []);
  
  return isTouch;
}

/**
 * A hook that combines mobile detection and touch support.
 * @returns An object with isMobile and isTouch booleans
 */
export function useDeviceInfo() {
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  
  return { isMobile, isTouch };
}