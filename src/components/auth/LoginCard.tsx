import Image from "next/image";
import { LoginForm } from "./LoginForm";

export function LoginCard() {
  return (
    <div className="w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[400px] bg-surface rounded-[14px] p-5 sm:p-6 border border-black/[0.08] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.18),0_8px_20px_-4px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset] text-center">
      {/* Corporate TPS logo displayed inside login card */}
      <div className="flex justify-center mb-2.5">
        <Image
          src="/images/logo-tps-warna.png"
          alt="Logo PT Terminal Petikemas Surabaya"
          width={320}
          height={100}
          priority
          className="h-9 sm:h-10 lg:h-11 w-auto object-contain select-none"
        />
      </div>

      <div className="space-y-0.5">
        <h1 className="text-[19px] lg:text-[21px] font-semibold text-navy leading-tight tracking-normal">
          Sistem Pengelolaan
          <br />
          Data Catering Karyawan
        </h1>
        <p className="text-[13px] lg:text-[14px] font-semibold text-navy">
          PT Terminal Petikemas Surabaya
        </p>
      </div>

      <div className="mt-3 sm:mt-3.5">
        <LoginForm />
      </div>
    </div>
  );
}
