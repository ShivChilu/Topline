import React from "react";
import Image from "next/image";
import { BRANDING } from "@/lib/branding";

interface BrandLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function BrandLogo({ width = 120, height = 120, className = "" }: BrandLogoProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={BRANDING.logo}
        alt={BRANDING.altText}
        width={width}
        height={height}
        style={{ objectFit: "contain" }}
        className="max-w-full h-auto"
      />
    </div>
  );
}
