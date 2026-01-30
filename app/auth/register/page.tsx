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
import { Eye, EyeOff, Loader2, ArrowRight, Key } from "lucide-react"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [registrationCode, setRegistrationCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    const validCode = process.env.NEXT_PUBLIC_REGISTRATION_CODE || "AGRODOC2025"
    if (registrationCode !== validCode) {
      setError("Código de cadastro inválido")
      setIsLoading(false)
      return
    }

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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("already registered")) {
          setError("Este e-mail já está cadastrado")
        } else {
          setError(error.message)
        }
      } else {
        setError("Ocorreu um erro ao criar a conta")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* Left side - Register Form */}
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
        <div className="flex-1 flex items-center justify-center px-6 lg:px-10 py-8">
          <div className="w-full max-w-[440px]">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight mb-3">
                Criar sua conta
              </h1>
              <p className="text-slate-500 text-base">
                Preencha os dados abaixo para começar
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="firstName" 
                    className={`text-sm font-medium transition-colors duration-200 ${
                      focusedField === 'firstName' ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Nome
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Joao"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    className="h-12 bg-white border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="lastName" 
                    className={`text-sm font-medium transition-colors duration-200 ${
                      focusedField === 'lastName' ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Sobrenome
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Silva"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    className="h-12 bg-white border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>
              </div>

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

              {/* Password fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="password" 
                    className={`text-sm font-medium transition-colors duration-200 ${
                      focusedField === 'password' ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 caracteres"
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

                <div className="space-y-2">
                  <Label 
                    htmlFor="confirmPassword" 
                    className={`text-sm font-medium transition-colors duration-200 ${
                      focusedField === 'confirmPassword' ? 'text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    Confirmar senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      className="h-12 bg-white border-slate-200 rounded-xl px-4 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Registration code */}
              <div className="space-y-2">
                <Label 
                  htmlFor="registrationCode" 
                  className={`text-sm font-medium transition-colors duration-200 ${
                    focusedField === 'registrationCode' ? 'text-slate-900' : 'text-slate-600'
                  }`}
                >
                  Código de cadastro
                </Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="registrationCode"
                    type="text"
                    placeholder="Código fornecido pela equipe"
                    required
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    onFocus={() => setFocusedField('registrationCode')}
                    onBlur={() => setFocusedField(null)}
                    className="h-12 bg-white border-slate-200 rounded-xl pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-slate-900/10 transition-all duration-200"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-slate-400 pl-1">
                  Entre em contato com a equipe para obter o código
                </p>
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
                    Criando conta...
                  </>
                ) : (
                  <>
                    Criar conta
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>

              {/* Login link */}
              <p className="text-center text-sm text-slate-500 pt-2">
                Ja tem uma conta?{" "}
                <Link
                  href="/auth/login"
                  className="text-slate-900 hover:text-slate-700 font-semibold transition-colors"
                >
                  Fazer login
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
