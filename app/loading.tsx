import Image from "next/image"

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-[#050816] transition-colors">
      <style>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="flex flex-col items-center">
        <div className="spinner rounded-full p-4 mb-4">
          <Image
            src="/images/agrodoc-icon.png"
            alt="AGRODOC Loading"
            width={48}
            height={48}
          />
        </div>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Carregando dados...
        </p>
      </div>
    </div>
  )
}
