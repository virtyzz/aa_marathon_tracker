"use client";
import Link from "next/link";
export default function AuthError(){return <main className="shell"><h1>Не удалось войти через Discord</h1><p>Проверьте callback URL и повторите вход. Секреты и технические детали намеренно не отображаются.</p><Link href="/">Вернуться на главную</Link></main>}
