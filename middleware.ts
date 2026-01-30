import { updateSession } from "@/lib/supabase/middleware"
import { type NextRequest } from "next/server"

async function middlewareHandler(request: NextRequest) {
  return await updateSession(request)
}

export default middlewareHandler

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - api routes (for CSV uploads, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
