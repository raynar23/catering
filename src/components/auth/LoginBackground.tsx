import Image from "next/image";

export function LoginBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      <Image
        src="/images/login-bg.png"
        alt="Pelabuhan PT Terminal Petikemas Surabaya saat senja"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[60%_50%]"
      />
      {/* Functional navy scrim to ensure text and card contrast */}
      <div className="absolute inset-0 bg-[#082B4D]/25 lg:bg-[#082B4D]/25" />
      {/* Subtle bottom gradient to enhance footer legibility */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 via-black/15 to-transparent" />
    </div>
  );
}
