"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCarousel } from "@/components/auth/AuthCarousel"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        setError("Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.")
        setIsLoading(false)
        return
      }
      
      router.push("/")
      router.refresh()
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("E-mail ou senha incorretos")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Por favor, confirme seu e-mail antes de fazer login")
        } else {
          setError(error.message)
        }
      } else {
        setError("Ocorreu um erro ao fazer login")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* Left side - Login Form */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6 lg:p-10">
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

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-10">
          <div className="w-full max-w-[400px]">
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                Bem-vindo de volta
              </h1>
              <p className="text-slate-500 text-base">
                Entre com suas credenciais para acessar o sistema
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
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
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="h-12 bg-white border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label 
                    htmlFor="password" 
                    className={`text-sm font-medium transition-colors duration-200 ${
                      focusedField === 'password' ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Senha
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="h-12 bg-white border-slate-200 rounded-xl px-4 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
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
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>

              {/* Register link */}
              <p className="text-center text-sm text-slate-500 pt-4">
                Ainda não tem uma conta?{" "}
                <Link
                  href="/auth/register"
                  className="text-slate-900 hover:text-slate-700 font-semibold transition-colors"
                >
                  Criar conta
                </Link>
              </p>
            </form>
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
