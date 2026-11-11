'use client';
import {useEffect,useId,useRef} from 'react';
import {ArrowLeft,Info,Wallet} from 'lucide-react';
export function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{const d=ref.current,previous=document.activeElement as HTMLElement|null;d?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return ()=>{d?.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
 return <dialog ref={ref} aria-labelledby={id} onCancel={onClose}><header className="modal-head"><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><ArrowLeft size={20}/></button><h2 id={id}>{title}</h2><span className="header-spacer"/></header><div className="modal-content">{children}</div></dialog>;
}
export function Field({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}) {return <label className="field"><span className="field-label">{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function InfoNote({label,children}:{label:string;children:React.ReactNode}) {return <details className="info-note"><summary><Info size={14}/>{label}</summary><p>{children}</p></details>;}
export function Empty({title,children}:{title:string;children:React.ReactNode}) {return <div className="empty"><span className="empty-icon"><Wallet size={25}/></span><h3>{title}</h3><div>{children}</div></div>;}
export type Save=(action:string,data:unknown)=>Promise<void>;
