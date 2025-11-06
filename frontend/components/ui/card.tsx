import * as React from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { useStarfield } from "@/components/starfield-context";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  const { theme } = useTheme();
  const { brightStars } = useStarfield();
  const [mounted, setMounted] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [reflections, setReflections] = React.useState<
    Array<{ x: number; y: number; intensity: number }>
  >([]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (theme !== "dark" || !mounted || !cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();

    // Map star positions to card coordinates
    const cardReflections = brightStars
      .map((star) => {
        const starX = star.x * window.innerWidth;
        const starY = star.y * window.innerHeight;

        // Calculate relative position on card (0-1 range)
        const relX = (starX - rect.left) / rect.width;
        const relY = (starY - rect.top) / rect.height;

        // Only show reflections for stars near or on the card
        const isNearCard =
          relX >= -0.3 && relX <= 1.3 && relY >= -0.3 && relY <= 1.3;

        return {
          x: relX * 100,
          y: relY * 100,
          intensity: star.intensity,
          isNear: isNearCard,
        };
      })
      .filter((r) => r.isNear);

    setReflections(cardReflections);
  }, [brightStars, theme, mounted]);

  return (
    <div
      ref={cardRef}
      data-slot="card"
      className={cn(
        "text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm relative overflow-hidden",
        mounted && theme === "dark"
          ? "bg-card/30 backdrop-blur-xl border-white/10 shadow-2xl shadow-blue-500/10"
          : "bg-card",
        className,
      )}
      {...props}
    >
      {mounted && theme === "dark" && (
        <>
          {/* Frosted glass texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
              mixBlendMode: "overlay",
            }}
          />

          {/* Star light reflections - scattered and diffused like on frosted glass */}
          {reflections.map((reflection, index) => (
            <div
              key={index}
              className="absolute pointer-events-none transition-all duration-500"
              style={{
                left: `${reflection.x}%`,
                top: `${reflection.y}%`,
                width: "80px",
                height: "80px",
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, rgba(255, 255, 255, ${reflection.intensity * 0.08}) 0%, rgba(240, 245, 255, ${reflection.intensity * 0.04}) 40%, transparent 70%)`,
                filter: "blur(15px)",
                opacity: 0.7,
              }}
            />
          ))}

          {/* Subtle random light scattering (frosted effect) */}
          {reflections.slice(0, 5).map((reflection, index) => (
            <div
              key={`scatter-${index}`}
              className="absolute pointer-events-none"
              style={{
                left: `${reflection.x + (index * 10 - 20)}%`,
                top: `${reflection.y + (index * 8 - 15)}%`,
                width: "40px",
                height: "40px",
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, rgba(255, 255, 255, ${reflection.intensity * 0.04}) 0%, transparent 60%)`,
                filter: "blur(10px)",
                opacity: 0.5,
              }}
            />
          ))}
        </>
      )}
      <div className="relative z-10 flex flex-col gap-6">{props.children}</div>
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
