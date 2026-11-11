import {Utensils,Car,ShoppingBag,Receipt,Shapes} from 'lucide-react';
const icons={food:Utensils,transport:Car,shopping:ShoppingBag,bills:Receipt};
export function CategoryIcon({category,size=19}:{category:string;size?:number}){const Icon=icons[category as keyof typeof icons]||Shapes;return <Icon size={size}/>;}
