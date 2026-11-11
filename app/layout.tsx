import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'DigiWallet · Your money, clearly',description:'Track your accounts, spending, investments and loans in one private wallet.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
