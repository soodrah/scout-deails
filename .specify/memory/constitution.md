<!--
<sync_impact_report>
Version change: Initial → 1.0.0
List of modified principles:
- [PRINCIPLE_1_NAME] → I. Grounded Hyper-Locality
- [PRINCIPLE_2_NAME] → II. Mobile-First Utility
- [PRINCIPLE_3_NAME] → III. Trust-Centered Data Governance
- [PRINCIPLE_4_NAME] → IV. Automated Growth (Admin-First)
- [PRINCIPLE_5_NAME] → V. Performance & Reliability
Added sections:
- Technical Foundations
- Quality Gates & Compliance
Templates requiring updates:
- .specify/templates/plan-template.md (✅ updated - reviewed for alignment)
- .specify/templates/spec-template.md (✅ updated - reviewed for alignment)
- .specify/templates/tasks-template.md (✅ updated - reviewed for alignment)
Follow-up TODOs:
- None.
</sync_impact_report>
-->

# Lokal Constitution

## Core Principles

### I. Grounded Hyper-Locality
Every deal, business recommendation, and search result MUST be grounded in real-world data using Google Maps and Google Search Grounding. We prioritize physical presence and verified local relevance over abstract data to ensure users connect with actual, nearby opportunities.

### II. Mobile-First Utility
The user interface MUST prioritize quick, on-the-go interactions. We ensure high-quality touch targets, intuitive gestures, and minimal friction for primary user workflows. Mobile users expect immediate value; the design MUST reflect this urgency.

### III. Trust-Centered Data Governance
User and business owner data MUST be rigorously protected. We leverage Supabase Row Level Security (RLS) to ensure data isolation. All AI-generated outreach and marketing content MUST be transparently marked and allow for human oversight to maintain brand trust.

### IV. Automated Growth (Admin-First)
For business owners, our tools MUST minimize manual effort. We leverage Gemini-driven lead generation and personalized outreach automation to handle the heavy lifting of business development, allowing admins to focus on strategic decisions.

### V. Performance & Reliability
The application MUST maintain native-level responsiveness. We aim for <100ms latency for UI interactions. Connectivity issues MUST be handled gracefully, ensuring the app remains functional in low-signal environments through efficient sync between Capacitor and Supabase.

## Technical Foundations
The project is built on a modern, scalable stack designed for speed and reliability:
- **Frontend**: React (TypeScript) + Vite + Tailwind CSS for a highly responsive and maintainable UI.
- **Backend**: Supabase (PostgreSQL + RLS + Auth) for secure, real-time data management.
- **AI**: Google Gemini API (gemini-2.5-flash) with Maps/Search Grounding for intelligent, real-world connected features.
- **Mobile**: Capacitor for seamless bridging between web technologies and native iOS/Android capabilities.

## Quality Gates & Compliance
To ensure the integrity and quality of Lokal, all contributions must pass the following gates:
- **Security**: All database changes MUST include corresponding RLS policy updates and be verified against the Supabase schema.
- **AI Accuracy**: AI prompts and grounding configurations MUST be tested for accuracy and real-world relevance before deployment.
- **Platform Consistency**: UI changes MUST be validated for consistency across both web and mobile (Capacitor) environments.
- **Testing**: Critical user journeys (Deal Search, Redemption, Admin Outreach) MUST have verified test cases or manual validation scripts.

## Governance
This Constitution is the foundational governance document for Lokal. It takes precedence over all other development practices. Amendments to these principles require a documented rationale and a version increment to ensure all contributors are aligned with the project's evolving vision.

- **Amendment Procedure**: Propose changes via PR, ensuring a Sync Impact Report is included.
- **Versioning Policy**: MAJOR for principle redefinitions, MINOR for additions/expansions, PATCH for clarifications.
- **Compliance Review**: All Pull Requests MUST be reviewed against these core principles.

**Version**: 1.0.0 | **Ratified**: 2026-03-28 | **Last Amended**: 2026-03-28
