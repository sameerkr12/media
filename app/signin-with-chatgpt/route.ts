import {NextResponse} from 'next/server';
export function GET(request:Request){const login=new URL('/login',request.url);login.searchParams.set('return_to',new URL(request.url).searchParams.get('return_to')||'/admin');return NextResponse.redirect(login);}
