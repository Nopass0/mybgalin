"use client";

import { motion } from "motion/react";
import { PortfolioManager } from "@/components/admin/portfolio-manager";

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Портфолио</h1>
          <p className="text-muted-foreground">
            Управление информацией о себе, опытом, навыками и проектами
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <PortfolioManager />
      </motion.div>
    </div>
  );
}
