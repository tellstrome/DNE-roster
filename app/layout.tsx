import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav/navBar";
import { TooltipProvider } from "@/components/ui/tooltip"


const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "DNE Roster",
  description: "your mom",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: user, error } = await supabase.auth.getUser();

  let userIsOfficer = false;

  if (user.user?.id && !error) {
    const {data: player, error:playerError} = await supabase
      .from("players")
      .select("*")
      .eq("user_id", user.user.id)
      .single();

    userIsOfficer = player.role === "officer";
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        <main className="min-h-screen flex flex-col">
          <div className="w-full flex justify-between items-center p-3 px-5 text-sm border-b border-b-foreground/10 h-16">
            <div className="flex gap-5 items-center font-semibold h-10 w-10">
              <Link href={"/"}>
                <Image src="/braincell.png" width={300} height={300} alt="braincell" className="object-contain h-10" />
              </Link>
            </div>
            <NavBar userIsOfficer={userIsOfficer} />
            {/** 
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            */}
          </div>

         
            <div className="flex-1 flex flex-col gap-6 p-4">     
              <TooltipProvider>{children}</TooltipProvider>
            </div>
          
          

          <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
        </main>
          
        </ThemeProvider>
      </body>
    </html>
  );
}
