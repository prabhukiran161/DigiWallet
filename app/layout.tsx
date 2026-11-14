import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'DigiWallet · Your money, clearly',description:'Track your accounts, spending, investments and loans in one private wallet.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;}
