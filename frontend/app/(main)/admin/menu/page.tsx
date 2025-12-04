"use client";

import { motion } from "motion/react";
import { MenuSettingsManager } from "@/components/admin/menu-settings-manager";

export default function MenuSettingsPage() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки меню</h1>
          <p className="text-muted-foreground">
            Управление видимостью пунктов меню на сайте
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <MenuSettingsManager />
      </motion.div>
    </div>
  );
}
