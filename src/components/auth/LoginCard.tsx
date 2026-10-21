import Image from "next/image";
import { LoginForm } from "./LoginForm";

export function LoginCard() {
  return (
    <div className="w-full max-w-[340px] sm:max-w-[360px] bg-surface rounded-[12px] px-5 py-4 sm:px-6 sm:py-5 border border-black/[0.08] shadow-[0_20px_45px_-12px_rgba(0,0,0,0.18),0_8px_16px_-4px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset] text-center">
      {/* Corporate TPS logo displayed inside login card */}
      <div className="flex justify-center mb-1.5">
        <Image
          src="/images/logo-tps-warna.png"
          alt="Logo PT Terminal Petikemas Surabaya"
          width={280}
          height={80}
          priority
          className="h-7 sm:h-8 w-auto object-contain select-none"
        />
      </div>

      <div className="space-y-0.5">
        <h1 className="text-[17px] sm:text-[18px] font-bold text-navy leading-tight tracking-normal">
          Sistem Pengelolaan
          <br />
          Data Catering Karyawan
        </h1>
        <p className="text-[12px] sm:text-[13px] font-medium text-navy/80">
          PT Terminal Petikemas Surabaya
        </p>
      </div>

      <div className="mt-2">
        <LoginForm />
      </div>
    </div>
  );
}
