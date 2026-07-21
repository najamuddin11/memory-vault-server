import { GraphQLError } from "graphql";
import { prisma } from "../prismaClient.js";
import nodemailer from "nodemailer";
import { contactMessageSchema } from "../security/validation.js";
import { verifyCsrfToken } from "../security/csrf.js";
import { isContactRateLimited } from "../security/contactRateLimit.js";
import type { GraphQLContext } from "../context.js";

function serializePortfolio(p: {
  id: number;
  featured: boolean;
  title: string;
  companyBuiltWith: string | null;
  desc: string;
  projectColor: string | null;
  projectText: string | null;
  outcome: string | null;
  link: string | null;
  moreInfoLink: string | null;
  projectLogo: string | null;
  image: string;
  status: string;
  skills: string[];
  carousel: {
    id: number;
    img: string;
    desc: string | null;
    title: string | null;
    gridArea: string | null;
  }[];
}) {
  return {
    ...p,
    image: p.image,
    projectLogo: p.projectLogo,
    carousel: p.carousel.map((c) => ({ ...c, img: c.img })),
  };
}

async function getPortfolioData(options?: { featuredOnly?: boolean }) {
  const rows = await prisma.portfolio.findMany({
    where: options?.featuredOnly ? { featured: true } : undefined,
    orderBy: { order: "asc" },
    include: { carousel: { orderBy: { order: "asc" } } },
  });
  return rows.map(serializePortfolio);
}

export const resolvers = {
  Query: {
    homeData: async () => {
      const [
        introData,
        serviceData,
        portfolioData,
        workExperienceData,
        testimonialsData,
        educationData,
        skillsData,
        contactData,
      ] = await Promise.all([
        prisma.intro.findMany({}),
        prisma.service.findMany({ orderBy: { order: "asc" } }),
        getPortfolioData({ featuredOnly: true }),
        prisma.workExperience.findMany({ orderBy: { order: "asc" } }),
        prisma.testimonial.findMany({ orderBy: { order: "asc" } }),
        prisma.education.findMany({ orderBy: { order: "asc" } }),
        prisma.skill.findMany({ orderBy: { order: "asc" } }),
        prisma.contactInfo.findMany({ orderBy: { order: "asc" } }),
      ]);

      return {
        introData,
        serviceData,
        portfolioData,
        workExperienceData,
        testimonialsData,
        educationData,
        skillsData,
        contactData,
      };
    },

    portfolio: async () => getPortfolioData(),

    portfolioById: async (_: unknown, { id }: { id: string }) => {
      const row = await prisma.portfolio.findUnique({
        where: { id: Number(id) },
        include: { carousel: { orderBy: { order: "asc" } } },
      });
      return row ? serializePortfolio(row) : null;
    },
  },

  Mutation: {
    sendMessage: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          name: string;
          email: string;
          message: string;
          recaptchaToken?: string;
          csrfToken?: string;
          company?: string;
        };
      },
      context: GraphQLContext,
    ) => {
      // 1. Validate & sanitize input shape/lengths before anything else.
      const parsed = contactMessageSchema.safeParse(input);
      if (!parsed.success) {
        const validationErrors: Record<string, string> = {};
        for (const issue of parsed.error.errors) {
          const field = issue.path[0] as string;
          if (field && !validationErrors[field])
            validationErrors[field] = issue.message;
        }
        throw new GraphQLError("Validation failed", {
          extensions: { code: "BAD_USER_INPUT", validationErrors },
        });
      }
      const data = parsed.data;

      // 2. Honeypot: real users never fill this in. Bots that blindly fill
      // every field will. Pretend it worked so they don't adapt.
      if (data.company && data.company.trim().length > 0) {
        console.warn(`[security] Honeypot triggered from IP ${context.ip}`);
        return {
          success: true,
          message: "Message received - thanks for reaching out!",
        };
      }

      // 3. CSRF-style origin token - proves the request came from a page
      // that could actually read a token from our origin.
      if (!verifyCsrfToken(data.csrfToken)) {
        throw new GraphQLError(
          "Invalid or expired form token. Please reload the page and try again.",
          {
            extensions: { code: "FORBIDDEN" },
          },
        );
      }

      // 4. Per-IP rate limit specific to this mutation (on top of the
      // coarser route-level limiter on /graphql in index.ts).
      if (isContactRateLimited(context.ip)) {
        throw new GraphQLError(
          "Too many messages sent. Please try again later.",
          {
            extensions: { code: "RATE_LIMITED" },
          },
        );
      }

      await prisma.contactMessage.create({
        data: { name: data.name, email: data.email, message: data.message },
      });

      // Email is entirely optional - only attempted if SMTP env vars are set.
      if (
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
      ) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: false,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });

          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER,
            replyTo: data.email,
            subject: `New portfolio contact message from ${data.name}`,
            text: data.message,
          });
        } catch (err) {
          // Don't fail the mutation just because email delivery failed -
          // the message is already safely stored in the database.
          console.error("Failed to send contact email:", err);
        }
      }

      return {
        success: true,
        message: "Message received - thanks for reaching out!",
      };
    },
  },
};
