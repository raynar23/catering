import Image from "next/image";
import { LoginBackground } from "@/components/auth/LoginBackground";
import { LoginCard } from "@/components/auth/LoginCard";

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <LoginBackground />

      {/* Top Header with Corporate Colored Logo */}
      <header className="w-full flex justify-start lg:absolute lg:top-8 lg:left-8 lg:w-auto z-10">
        <div className="bg-white/95 rounded-[10px] px-3 py-1.5 lg:py-2 shadow-sm border border-white/50 inline-flex items-center">
          <Image
            src="/images/logo-tps-warna.png"
            alt="PT Terminal Petikemas Surabaya"
            width={160}
            height={48}
            priority
            className="h-8 sm:h-9 lg:h-11 w-auto object-contain select-none"
          />
        </div>
      </header>

      {/* Center Card */}
      <section
        aria-label="Formulir Masuk"
        className="my-auto w-full flex justify-center py-4 sm:py-6 z-10"
      >
        <LoginCard />
      </section>

      {/* Footer */}
      <footer className="w-full text-center lg:absolute lg:bottom-6 lg:inset-x-0 z-10 pt-2 pb-1">
        <p className="text-xs text-white/90 font-normal tracking-wide select-none">
          © 2026 PT Terminal Petikemas Surabaya
        </p>
      </footer>
    </main>
  );
}
