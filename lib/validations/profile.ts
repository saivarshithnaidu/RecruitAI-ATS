import * as z from "zod"

export const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
    education: z.string().min(10, "Please provide more detail about your education"),
    experience: z.string().min(10, "Please provide more detail about your experience"),
    skills: z.string().min(2, "Please list at least one skill"), // We will parse comma separated string
    preferredRole: z.string().min(2, "Preferred role is required"),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
