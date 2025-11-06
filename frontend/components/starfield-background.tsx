"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useStarfield } from "./starfield-context";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: "white" | "red" | "blue";
}

interface Nebula {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  hue: number;
}

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, resolvedTheme } = useTheme();
  const { updateBrightStars } = useStarfield();
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const animationFrameRef = useRef<number>();
  const frameCountRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the actual theme (resolvedTheme handles system theme)
  const actualTheme = theme === "system" ? resolvedTheme : theme;

  useEffect(() => {
    if (!mounted || actualTheme !== "dark") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Create stars with colors (mostly white, some red/blue)
    const createStars = (count: number): Star[] => {
      return Array.from({ length: count }, () => {
        const rand = Math.random();
        let color: "white" | "red" | "blue";
        if (rand < 0.75)
          color = "white"; // 75% white
        else if (rand < 0.88)
          color = "blue"; // 13% blue
        else color = "red"; // 12% red

        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.2 + 0.3, // Smaller stars
          speed: Math.random() * 0.4 + 0.15,
          opacity: Math.random() * 0.7 + 0.4,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
          twinklePhase: Math.random() * Math.PI * 2,
          color,
        };
      });
    };

    // Create nebulae (cloud-like structures)
    const createNebulae = (count: number): Nebula[] => {
      return Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 150 + 100,
        speed: Math.random() * 0.05 + 0.02,
        opacity: Math.random() * 0.15 + 0.05,
        hue: Math.random() * 360, // Random color hue
      }));
    };

    starsRef.current = createStars(250);
    nebulaeRef.current = createNebulae(8);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nebulae first (background layer)
      nebulaeRef.current.forEach((nebula) => {
        nebula.y -= nebula.speed;

        // Reset nebula when it goes off screen
        if (nebula.y < -nebula.size) {
          nebula.y = canvas.height + nebula.size;
          nebula.x = Math.random() * canvas.width;
        }

        // Create soft cloudy gradient
        const gradient = ctx.createRadialGradient(
          nebula.x,
          nebula.y,
          0,
          nebula.x,
          nebula.y,
          nebula.size,
        );

        gradient.addColorStop(
          0,
          `hsla(${nebula.hue}, 60%, 50%, ${nebula.opacity * 0.4})`,
        );
        gradient.addColorStop(
          0.5,
          `hsla(${nebula.hue + 30}, 55%, 45%, ${nebula.opacity * 0.2})`,
        );
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, nebula.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Track bright stars for reflections (update every 3 frames for performance)
      frameCountRef.current++;
      const shouldUpdateReflections = frameCountRef.current % 3 === 0;
      const brightStarsList: { x: number; y: number; intensity: number }[] = [];

      // Draw stars
      starsRef.current.forEach((star) => {
        // Move star upward
        star.y -= star.speed;

        // Reset star when it goes off screen
        if (star.y < -10) {
          star.y = canvas.height + 10;
          star.x = Math.random() * canvas.width;
        }

        // Twinkle effect
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const currentOpacity = star.opacity * twinkle;

        // Get color based on star type
        let coreColor: string;
        let glowColor: string;
        let outerColor: string;

        if (star.color === "red") {
          coreColor = `rgba(255, 220, 200, ${currentOpacity})`;
          glowColor = `rgba(255, 180, 150, ${currentOpacity * 0.6})`;
          outerColor = `rgba(255, 150, 120, ${currentOpacity * 0.3})`;
        } else if (star.color === "blue") {
          coreColor = `rgba(200, 220, 255, ${currentOpacity})`;
          glowColor = `rgba(150, 180, 255, ${currentOpacity * 0.6})`;
          outerColor = `rgba(120, 150, 255, ${currentOpacity * 0.3})`;
        } else {
          // White stars
          coreColor = `rgba(255, 255, 255, ${currentOpacity})`;
          glowColor = `rgba(240, 245, 255, ${currentOpacity * 0.6})`;
          outerColor = `rgba(220, 230, 255, ${currentOpacity * 0.3})`;
        }

        // Draw subtle outer glow (smaller than before)
        const outerGradient = ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          star.size * 4,
        );
        outerGradient.addColorStop(0, glowColor);
        outerGradient.addColorStop(0.5, outerColor);
        outerGradient.addColorStop(1, "transparent");

        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw bright core (small and sharp)
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Track bright stars for reflections (only brightest ones)
        if (shouldUpdateReflections && currentOpacity > 0.6 && star.size > 2) {
          brightStarsList.push({
            x: star.x / canvas.width,
            y: star.y / canvas.height,
            intensity: currentOpacity,
          });
        }
      });

      // Update bright stars context for card reflections
      if (shouldUpdateReflections) {
        // Limit to top 15 brightest stars
        const topBrightStars = brightStarsList
          .sort((a, b) => b.intensity - a.intensity)
          .slice(0, 15);
        updateBrightStars(topBrightStars);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mounted, actualTheme]);

  if (!mounted || actualTheme !== "dark") return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
