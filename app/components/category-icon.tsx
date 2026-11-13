import {Utensils,Car,ShoppingBag,Receipt,Shapes,House,HeartPulse,GraduationCap,Plane,Briefcase,Gift,Fuel,Dumbbell,Coffee,PawPrint,Smartphone} from 'lucide-react';
import {type Wallet} from '@/lib/ledger';
const icons={food:Utensils,transport:Car,shopping:ShoppingBag,bills:Receipt,other:Shapes,home:House,health:HeartPulse,education:GraduationCap,travel:Plane,work:Briefcase,gift:Gift,fuel:Fuel,fitness:Dumbbell,coffee:Coffee,pets:PawPrint,phone:Smartphone};
export function CategoryIcon({category,size=19,wallet}:{category:string;size?:number;wallet?:Wallet}){const key=wallet?.categories.find(c=>c.id===category)?.icon||category;const Icon=icons[key as keyof typeof icons]||Shapes;return <Icon size={size}/>;}
