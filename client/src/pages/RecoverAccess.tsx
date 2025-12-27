import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RecoverAccess() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation('/artist-login');
  }, [setLocation]);

  return null;
}
