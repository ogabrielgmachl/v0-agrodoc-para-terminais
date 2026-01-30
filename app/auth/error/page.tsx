import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background dark">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
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
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Erro de autenticacao
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ocorreu um problema ao processar sua solicitacao
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              O link pode ter expirado ou ja ter sido utilizado. Por favor, tente novamente.
            </p>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <Link href="/auth/login">Voltar ao login</Link>
              </Button>

              <Button asChild variant="outline" className="w-full h-11 bg-transparent">
                <Link href="/auth/forgot-password">Recuperar senha</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          2025 AGRODOC. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
