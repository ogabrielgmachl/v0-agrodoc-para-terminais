"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCarousel } from "@/components/auth/AuthCarousel"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Mail, ArrowLeft, CheckCircle2, ArrowRight } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setIsSuccess(true)
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Ocorreu um erro ao enviar o e-mail")
      }
    } finally {
      setIsLoading(false)
    }
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
                  E-mail enviado!
                </h1>
                <p className="text-slate-500 text-base mb-8">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>

                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full h-12 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl bg-transparent font-medium transition-all duration-200"
                    onClick={() => {
                      setIsSuccess(false)
                      setEmail("")
                    }}
                  >
                    Enviar novamente
                  </Button>
                  <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      className="w-full h-12 text-slate-600 hover:text-slate-900 rounded-xl"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar ao login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              /* Form state */
              <>
                {/* Header */}
                <div className="mb-10">
                  <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                    Esqueceu a senha?
                  </h1>
                  <p className="text-slate-500 text-base">
                    Digite seu e-mail para receber um link de recuperação.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* Email field */}
                  <div className="space-y-2">
                    <Label 
                      htmlFor="email" 
                      className={`text-sm font-medium transition-colors duration-200 ${
                        focusedField === 'email' ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      E-mail
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className="h-12 bg-white border-slate-200 rounded-xl pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                        disabled={isLoading}
                      />
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
                        Enviando...
                      </>
                    ) : (
                      <>
                        Solicitar recuperação
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
