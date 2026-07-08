-- CreateTable
CREATE TABLE "portfolios" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "companyBuiltWith" TEXT,
    "desc" TEXT NOT NULL,
    "projectColor" TEXT,
    "projectText" TEXT,
    "outcome" TEXT,
    "link" TEXT,
    "moreInfoLink" TEXT,
    "projectLogo" TEXT,
    "image" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "skills" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intro" (
    "id" SERIAL NOT NULL,
    "img" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "summary" TEXT,
    "resume" TEXT,

    CONSTRAINT "intro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carousel_items" (
    "id" SERIAL NOT NULL,
    "img" TEXT NOT NULL,
    "desc" TEXT,
    "title" TEXT,
    "gridArea" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "portfolioId" INTEGER NOT NULL,

    CONSTRAINT "carousel_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "iconLight" TEXT NOT NULL,
    "iconDark" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "academy" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_experience" (
    "id" SERIAL NOT NULL,
    "duration" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "icon" TEXT,
    "companyDescription" TEXT NOT NULL,
    "whatIdid" JSONB NOT NULL,
    "skillsUsed" TEXT[],
    "achievement" TEXT,
    "companySite" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "work_experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT,
    "progress" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" SERIAL NOT NULL,
    "profile" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_info" (
    "id" SERIAL NOT NULL,
    "text" TEXT[],
    "iconLight" TEXT NOT NULL,
    "iconDark" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "contact_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_slug_key" ON "portfolios"("slug");

-- AddForeignKey
ALTER TABLE "carousel_items" ADD CONSTRAINT "carousel_items_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
