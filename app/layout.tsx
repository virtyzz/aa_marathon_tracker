import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "ArcheAge Marathon Tracker", description: "Личный трекер Марафона героев" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html>; }
