import * as z from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(1, { message: "Senha é obrigatória." }),
});

export const MfaSetupSchema = z.object({
  mfaCode: z.string().length(6, { message: "O código MFA deve ter 6 dígitos." }),
});

export const MfaVerifySchema = z.object({
  mfaCode: z.string().length(6, { message: "O código MFA deve ter 6 dígitos." }),
});

export const SystemSettingsSchema = z.object({
  conferencia_cega_dinheiro_habilitada: z.boolean(),
  // Adicione outras configurações aqui
});

// Example for a form
export const AbrirCaixaSchema = z.object({
  valor_inicial: z.preprocess(
    (val) => parseFloat(String(val).replace(",", ".")),
    z.number().positive({ message: "Valor inicial deve ser positivo." })
  ),
  // Add other fields if necessary
});

// TODO: Add more schemas as per application needs
// e.g., UserSchema, FecharCaixaSchema, SolicitacaoSchema, etc.
