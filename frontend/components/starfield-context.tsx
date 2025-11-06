"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface StarPosition {
  x: number;
  y: number;
  intensity: number;
}

interface StarfieldContextType {
  brightStars: StarPosition[];
  updateBrightStars: (stars: StarPosition[]) => void;
}

const StarfieldContext = createContext<StarfieldContextType>({
  brightStars: [],
  updateBrightStars: () => {},
});

export const useStarfield = () => useContext(StarfieldContext);

export function StarfieldProvider({ children }: { children: React.ReactNode }) {
  const [brightStars, setBrightStars] = useState<StarPosition[]>([]);

  const updateBrightStars = useCallback((stars: StarPosition[]) => {
    setBrightStars(stars);
  }, []);

  return (
    <StarfieldContext.Provider value={{ brightStars, updateBrightStars }}>
      {children}
    </StarfieldContext.Provider>
  );
}
