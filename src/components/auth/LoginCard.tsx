import Image from "next/image";
import { LoginForm } from "./LoginForm";

export function LoginCard() {
  return (
    <div className="w-full max-w-[420px] bg-surface rounded-[14px] p-6 lg:p-8 border border-black/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.18),0_8px_20px_-4px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset] text-center">
      {/* TPS Emblem above Title */}
      <div className="flex justify-center mb-3">
        <Image
          src="/images/tps-symbol.png"
          alt="Logo Terminal Petikemas Surabaya"
          width={64}
          height={50}
          priority
          className="h-11 lg:h-12 w-auto object-contain select-none"
        />
      </div>

      <div className="space-y-1">
        <h1 className="text-[20px] lg:text-[22px] font-semibold text-navy leading-tight tracking-normal">
          Sistem Pengelolaan
          <br />
          Data Catering Karyawan
        </h1>
        <p className="text-[14px] lg:text-[15px] font-semibold text-navy">
          PT Terminal Petikemas Surabaya
        </p>
      </div>

      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
