# **App Name**: CartórioCashFlow

## Core Features:

- Role-Based Dashboards: Dashboard for each user role, displaying relevant information and actions based on their permissions (operador_caixa, supervisor_caixa, supervisor_conferencia, admin).
- MFA Authentication: Secure MFA/TOTP authentication flow for all users, including QR code generation and backup code provision, fully integrated with critical actions.
- Form validation: Form validation on the client and server side with Zod

## Style Guidelines:

- Primary color: Soft teal (#64CCC5) for trustworthiness and clarity.
- Background color: Light pale blue (#E5F4F3) for a calm, neutral base.
- Accent color: Muted green (#54B435) to indicate approvals.
- Body and headline font: 'Inter' (sans-serif) for a modern, objective, and neutral feel, suitable for both headlines and body text.
- Use a consistent set of icons from 'shadcn/ui' to represent payment types and user roles.
- Clean and structured layouts to support the UX workflows defined in the prompt