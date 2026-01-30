import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle2, Mail } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen w-full flex dark">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <Image
              src="/images/agrodoc-logo-white.png"
              alt="AGRODOC"
              width={180}
              height={48}
              className="h-12 w-auto"
            />
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Conta criada
              <br />
              <span className="text-emerald-300">Com sucesso!</span>
            </h1>
            <p className="text-emerald-100/80 text-lg max-w-md">
              Verifique seu e-mail para confirmar sua conta e comecar a usar o AGRODOC.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Image
              src="/images/cli-logo.webp"
              alt="CLI"
              width={120}
              height={40}
              className="h-10 w-auto opacity-70"
            />
          </div>
        </div>
      </div>

      {/* Right side - Success message */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/images/agrodoc-logo-new.png"
              alt="AGRODOC"
              width={64}
              height={64}
              className="h-16 w-auto"
            />
          </div>

          <Card className="border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Obrigado por se cadastrar!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Verifique seu e-mail para confirmar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                <Mail className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Verifique sua caixa de entrada</p>
                  <p className="text-sm text-muted-foreground">
                    Enviamos um e-mail de confirmacao para voce. Clique no link do e-mail para ativar
                    sua conta.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  <Link href="/auth/login">Ir para o login</Link>
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Nao recebeu o e-mail? Verifique sua pasta de spam ou{" "}
                  <Link href="/auth/register" className="text-emerald-500 hover:text-emerald-400">
                    tente novamente
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            2025 AGRODOC. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
