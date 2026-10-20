import Image from "next/image";
import { LoginBackground } from "@/components/auth/LoginBackground";
import { LoginCard } from "@/components/auth/LoginCard";

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col justify-between items-center px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <LoginBackground />

      {/* Top Header with Corporate Colored Logo without background panel */}
      <header className="w-full flex justify-start lg:absolute lg:top-8 lg:left-8 lg:w-auto z-10">
        <Image
          src="/images/logo-tps-warna.png"
          alt="PT Terminal Petikemas Surabaya"
          width={220}
          height={68}
          priority
          className="h-10 sm:h-12 lg:h-14 w-auto object-contain select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
        />
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
