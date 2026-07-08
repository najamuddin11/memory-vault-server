import { z } from "zod";

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(200),
  message: z
    .string()
    .trim()
    .min(10, "Message is too short")
    .max(5000, "Message is too long"),
  // Honeypot: a field real users never see or fill in. Named to look
  // legitimate to a scraping bot filling every input it finds.
  company: z.string().optional(),
  recaptchaToken: z.string().optional(),
  csrfToken: z.string().optional(),
});

export type ContactMessageInputValidated = z.infer<typeof contactMessageSchema>;
