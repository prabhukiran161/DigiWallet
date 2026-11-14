import {
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Shapes,
  House,
  HeartPulse,
  GraduationCap,
  Plane,
  Briefcase,
  Gift,
  Fuel,
  Dumbbell,
  Coffee,
  PawPrint,
  Smartphone,
  UsersRound,
  Motorbike,
  ShoppingCart,
  Sprout,
  PiggyBank,
} from "lucide-react";
import type { Wallet } from "@/lib/ledger";

const CATEGORY_ICONS = {
  food: Utensils,
  users: UsersRound,
  transport: Car,
  shopping: ShoppingBag,
  bills: Receipt,
  other: Shapes,
  home: House,
  health: HeartPulse,
  education: GraduationCap,
  travel: Plane,
  work: Briefcase,
  gift: Gift,
  fuel: Fuel,
  fitness: Dumbbell,
  coffee: Coffee,
  pets: PawPrint,
  phone: Smartphone,
  bike: Motorbike,
  groceries: ShoppingCart,
  growth: Sprout,
  savings: PiggyBank,
} as const;

interface CategoryIconProps {
  category: string;
  size?: number;
  wallet?: Wallet;
}

export function CategoryIcon({
  category,
  size = 19,
  wallet,
}: CategoryIconProps) {
  const key =
    wallet?.categories.find((c) => c.id === category)?.icon || category;
  const Icon = CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS] || Shapes;
  return <Icon size={size} />;
}
