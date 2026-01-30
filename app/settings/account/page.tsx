"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Edit2, Loader2, Mail, Shield, User, X } from "lucide-react"

export default function AccountSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // Dark mode - read from localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme")
      return saved === "dark"
    }
    return false
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // User data
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  
  // Original values for cancellation
  const [originalFirstName, setOriginalFirstName] = useState("")
  const [originalLastName, setOriginalLastName] = useState("")

  // Password change
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Listen for theme changes in localStorage
  useEffect(() => {
    // Note: the "storage" event only fires across tabs. For same-tab theme toggles,
    // we re-read theme when this page is mounted and whenever the tab becomes visible.
    const readTheme = () => {
      const saved = localStorage.getItem("theme")
      setIsDarkMode(saved === "dark")
    }

    const handleStorageChange = () => readTheme()
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") readTheme()
    }

    readTheme()
    window.addEventListener("storage", handleStorageChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)
      setEmail(user.email || "")

      // Try to load profile data from profiles table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single()

      if (error) {
        console.log("[v0] Profiles table error:", error.code, error.message)
        // Fallback to user_metadata
        const metadata = user.user_metadata || {}
        const fName = metadata.first_name || metadata.firstName || ""
        const lName = metadata.last_name || metadata.lastName || ""
        setFirstName(fName)
        setLastName(lName)
        setOriginalFirstName(fName)
        setOriginalLastName(lName)
        console.log("[v0] Using user_metadata:", fName, lName)
      } else if (profile) {
        setFirstName(profile.first_name || "")
        setLastName(profile.last_name || "")
        setOriginalFirstName(profile.first_name || "")
        setOriginalLastName(profile.last_name || "")
        console.log("[v0] Using profiles table:", profile.first_name, profile.last_name)
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar dados do usuário:", error)
      setErrorMessage("Erro ao carregar dados do usuário")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      if (!userId) {
        setErrorMessage("Usuário não encontrado")
        return
      }

      // Try to update profiles table first
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (profileError) {
        console.log("[v0] Profiles update failed:", profileError.code, profileError.message)
        // If profiles table doesn't exist or update failed, try upsert
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({
            id: userId,
            email: email,
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString(),
          })
        
        if (upsertError) {
          console.log("[v0] Profiles upsert also failed:", upsertError.code, upsertError.message)
        }
      }

      // Always update auth metadata (this should work regardless)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          firstName: firstName,
          lastName: lastName,
        },
      })

      if (authError) {
        console.error("[v0] Auth metadata update failed:", authError)
        throw authError
      }

      console.log("[v0] Profile saved successfully to user_metadata")
      setOriginalFirstName(firstName)
      setOriginalLastName(lastName)
      setIsEditingProfile(false)
      setSuccessMessage("Dados atualizados com sucesso!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error("[v0] Erro ao atualizar perfil:", error)
      setErrorMessage(error.message || "Erro ao atualizar dados")
      setTimeout(() => setErrorMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChangingPassword(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas não coincidem")
      setIsChangingPassword(false)
      setTimeout(() => setErrorMessage(null), 5000)
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage("A nova senha deve ter no mínimo 6 caracteres")
      setIsChangingPassword(false)
      setTimeout(() => setErrorMessage(null), 5000)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setSuccessMessage("Senha alterada com sucesso!")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error("[v0] Erro ao alterar senha:", error)
      setErrorMessage(error.message || "Erro ao alterar senha")
      setTimeout(() => setErrorMessage(null), 5000)
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-[#0B1017]" : "bg-gradient-to-br from-gray-50 via-white to-gray-50"}`}>
        <Loader2 className={`h-8 w-8 animate-spin ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
      </div>
    )
  }

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-[#0B1017]" : "bg-gradient-to-br from-gray-50 via-white to-gray-50"}`}>
      {/* Main content wrapper - fixed header, scrollable content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header - fixed */}
        <div className={`flex-shrink-0 sticky top-0 z-10 border-b ${isDarkMode ? "border-white/10 bg-[#0B1017]/95 backdrop-blur" : "border-gray-200 bg-white/95 backdrop-blur"}`}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className={`rounded-full ${isDarkMode ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  Configurações da Conta
                </h1>
                <p className={`text-xs sm:text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Gerencie suas informações e segurança
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
            {/* Success/Error Messages */}
            {successMessage && (
              <div className={`px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 text-sm ${isDarkMode ? "bg-green-500/20 border border-green-500/30 text-green-400" : "bg-green-50 border border-green-200 text-green-800"}`}>
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <p className="font-medium">{successMessage}</p>
              </div>
            )}

            {errorMessage && (
              <div className={`px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 text-sm ${isDarkMode ? "bg-red-500/20 border border-red-500/30 text-red-400" : "bg-red-50 border border-red-200 text-red-800"}`}>
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Profile Information Card */}
            <Card className={`rounded-2xl border ${isDarkMode ? "bg-[#151C25] border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
              <CardHeader className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-blue-500/20" : "bg-blue-50"}`}>
                      <User className={`h-5 w-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    </div>
                    <div>
                      <CardTitle className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        Informações da conta
                      </CardTitle>
                      <CardDescription className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        Visualize e atualize suas informações
                      </CardDescription>
                    </div>
                  </div>
                  {!isEditingProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                      className={`flex items-center gap-2 rounded-lg ${isDarkMode ? "hover:bg-white/10 text-gray-300" : "hover:bg-gray-100 text-gray-700"}`}
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {!isEditingProfile ? (
                  // View Mode
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className={`p-4 rounded-xl ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                        <Label className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          Nome
                        </Label>
                        <p className={`mt-1 text-base font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {firstName || "Não informado"}
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                        <Label className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                          Sobrenome
                        </Label>
                        <p className={`mt-1 text-base font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {lastName || "Não informado"}
                        </p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl ${isDarkMode ? "bg-white/5" : "bg-gray-50"}`}>
                      <Label className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        E-mail
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className={`h-4 w-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                        <p className={`text-base font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Nome
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Digite seu nome"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={`h-11 rounded-xl ${isDarkMode ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500" : "bg-white border-gray-200"}`}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Sobrenome
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Digite seu sobrenome"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={`h-11 rounded-xl ${isDarkMode ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500" : "bg-white border-gray-200"}`}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                        E-mail
                      </Label>
                      <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className={`h-11 pl-10 rounded-xl ${isDarkMode ? "bg-white/5 border-white/10 text-gray-500" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                        />
                      </div>
                      <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                        O e-mail não pode ser alterado
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        className={`flex-1 sm:flex-none h-11 rounded-xl font-medium ${isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}`}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar alterações"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFirstName(originalFirstName)
                          setLastName(originalLastName)
                          setIsEditingProfile(false)
                        }}
                        className={`flex-1 sm:flex-none h-11 rounded-xl ${isDarkMode ? "border-white/10 text-gray-300 hover:bg-white/5 bg-transparent" : "border-gray-200"}`}
                        disabled={isSaving}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className={`rounded-2xl border ${isDarkMode ? "bg-[#151C25] border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
              <CardHeader className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isDarkMode ? "bg-amber-500/20" : "bg-amber-50"}`}>
                    <Shield className={`h-5 w-5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                  </div>
                  <div>
                    <CardTitle className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      Segurança da conta
                    </CardTitle>
                    <CardDescription className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                      Gerencie sua senha de acesso
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Nova senha
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Digite a nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`h-11 rounded-xl ${isDarkMode ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500" : "bg-white border-gray-200"}`}
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Confirmar nova senha
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirme a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`h-11 rounded-xl ${isDarkMode ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500" : "bg-white border-gray-200"}`}
                      minLength={6}
                      required
                    />
                  </div>

                  <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    A senha deve ter no mínimo 6 caracteres
                  </p>

                  <Button
                    type="submit"
                    className={`w-full sm:w-auto h-11 rounded-xl font-medium ${isDarkMode ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}`}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar senha"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
