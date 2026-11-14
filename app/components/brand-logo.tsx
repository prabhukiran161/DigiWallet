import Image from "next/image";
import { brandLogoPaths } from "@/lib/brand";

export function BrandLogo({ variant = "blue", size }: {
  variant?: "blue" | "white";
  size: number;
}) {
  return (
    <Image src={brandLogoPaths[variant]} alt="" width={size} height={size}
      className="shrink-0 rounded-[inherit] object-contain" />
  );
}
