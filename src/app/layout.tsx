import type {Metadata} from 'next';
import {Shell} from '@/components/shell';
import './globals.css';
import './marine.css';
export const metadata:Metadata={title:{default:'KNOTs.｜釣果と学びをつなぐ',template:'%s｜KNOTs.'},description:'釣果を残し、経験から学ぶ。釣り人とコーチをつなぐコミュニティ。',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body><Shell>{children}</Shell></body></html>;}
