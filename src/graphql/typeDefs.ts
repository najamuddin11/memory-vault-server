export const typeDefs = `#graphql
  type CarouselItem {
    id: ID!
    img: String!
    desc: String
    title: String
    gridArea: String
  }
  
  type Intro {
    id: ID!
    img: String!
    firstName: String
    lastName: String
    summary: String
    resume:  String
  }

  type Portfolio {
    id: ID!
    featured: Boolean
    title: String!
    companyBuiltWith: String
    desc: String!
    projectColor: String
    projectText: String
    outcome: String
    link: String
    moreInfoLink: String
    projectLogo: String
    image: String!
    status: String!
    carousel: [CarouselItem!]!
    skills: [String!]!
  }

  type Service {
    id: ID!
    iconLight: String!
    iconDark: String!
    title: String!
    details: String!
  }

  type Education {
    id: ID!
    city: String!
    duration: String!
    academy: String!
    degree: String!
  }

  type WhatIDidItem {
    title: String!
    desc: String!
  }

  type WorkExperience {
    id: ID!
    duration: String!
    designation: String!
    company: String!
    location: String
    icon: String
    companyDescription: String!
    whatIdid: [WhatIDidItem!]!
    skillsUsed: [String!]!
    achievement: String
    companySite: String
  }

  type Skill {
    id: ID!
    title: String!
    level: String
    progress: Int
  }

  type Testimonial {
    id: ID!
    profile: String!
    name: String!
    designation: String!
    description: String!
  }

  type ContactInfo {
    id: ID!
    text: [String!]!
    iconLight: String!
    iconDark: String!
    link: String!
  }

  type HomeData {
    introData: [Intro!]!
    serviceData: [Service!]!
    portfolioData: [Portfolio!]!
    workExperienceData: [WorkExperience!]!
    testimonialsData: [Testimonial!]!
    educationData: [Education!]!
    skillsData: [Skill!]!
    contactData: [ContactInfo!]!
  }

  type Query {
    """Everything the home page needs, in one request."""
    homeData: HomeData!

    """All portfolio projects (not just the featured ones on the home page)."""
    portfolio: [Portfolio!]!
    portfolioById(id: ID!): Portfolio
  }

  input ContactMessageInput {
    name: String!
    email: String!
    message: String!

    """Anti-bot token from reCAPTCHA v3, obtained client-side."""
    recaptchaToken: String

    """Stateless origin token from GET /csrf-token, refreshed per page load."""
    csrfToken: String

    """Honeypot field - must stay empty. Hide it visually (not with display:none) in the form's CSS. If filled, the submission is silently treated as spam."""
    company: String
  }

  type SendMessageResponse {
    success: Boolean!
    message: String!
  }

  type Mutation {
    sendMessage(input: ContactMessageInput!): SendMessageResponse!
  }
`;
