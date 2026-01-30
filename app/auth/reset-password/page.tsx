"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCarousel } from "@/components/auth/AuthCarousel"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Lock, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsValidSession(!!session)
      setIsCheckingSession(false)
    }
    checkSession()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("As senhas não correspondem")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })
      if (error) throw error
      setIsSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Ocorreu um erro ao redefinir a senha")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-slate-900/10 rounded-full blur-xl animate-pulse" />
            <Loader2 className="relative h-10 w-10 animate-spin text-slate-900" />
          </div>
          <p className="text-sm text-slate-500">Verificando sessao...</p>
        </div>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md text-center">
          {/* Error icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Lock className="h-10 w-10 text-amber-500" />
              </div>
            </div>
          </div>
          
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-3">
            Link expirado
          </h1>
          <p className="text-slate-500 text-base mb-8">
            Este link de recuperacao de senha expirou ou ja foi utilizado.
          </p>

          <Button
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-300 group"
            onClick={() => router.push("/auth/forgot-password")}
          >
            Solicitar novo link
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* Left side - Form */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6 lg:p-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/agrodoc-logo-new.png"
                alt="AGRODOC"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                AGRODOC
              </span>
            </div>
            <Image
              src="/images/cli-logo.png"
              alt="Cliente"
              width={50}
              height={50}
              className="h-12 w-auto"
            />
          </div>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-10">
          <div className="w-full max-w-[400px]">
            {isSuccess ? (
              /* Success state */
              <div className="text-center">
                {/* Success icon with animation */}
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                  </div>
                </div>
                
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                  Senha alterada!
                </h1>
                <p className="text-slate-500 text-base mb-2">
                  Sua senha foi redefinida com sucesso.
                </p>
                <p className="text-slate-400 text-sm">
                  Redirecionando para o sistema...
                </p>

                {/* Loading indicator */}
                <div className="mt-8 flex justify-center">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" />
                  </div>
                </div>
              </div>
            ) : (
              /* Form state */
              <>
                {/* Header */}
                <div className="mb-10">
                  <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                    Nova senha
                  </h1>
                  <p className="text-slate-500 text-base">
                    Digite sua nova senha abaixo
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* Password field */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor="password" 
                      className={`text-sm font-medium transition-colors duration-200 ${
                        focusedField === 'password' ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      Nova senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimo 6 caracteres"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className="h-12 bg-white border-slate-200 rounded-xl pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password field */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor="confirmPassword" 
                      className={`text-sm font-medium transition-colors duration-200 ${
                        focusedField === 'confirmPassword' ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      Confirmar nova senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repita a senha"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        className="h-12 bg-white border-slate-200 rounded-xl pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <Button
                    type="submit"
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-300 group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        Salvar nova senha
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 lg:p-10">
        </div>
      </div>

      {/* Right side - Image Carousel */}
      <AuthCarousel />
    </div>
  )
}
