import type { DefaultSession, DefaultUser } from "next-auth"
import type { JWT as DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      cargo: string
      isMfaEnabled: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    cargo: string
    isMfaEnabled: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    cargo: string
    isMfaEnabled: boolean
  }
}
