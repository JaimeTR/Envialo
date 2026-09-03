import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className }) => {
  return (
    <>
      <img src="/branding/envialo-icon-light.svg" alt="Envialo" className={cn(className, "dark:hidden")} />
      <img src="/branding/envialo-icon-dark.svg" alt="Envialo" className={cn(className, "hidden dark:block")} />
    </>
  );
};
