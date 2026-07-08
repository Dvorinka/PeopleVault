# Personal Relationship Manager (Privacy-First)

## Project Overview

Build a **privacy-first Personal Relationship Manager** that helps users manage and remember the important people in their lives.

This is **NOT** a CRM for sales or business contacts.

The application is designed for tracking:

- Family
- Friends
- Partner
- Relatives
- Colleagues
- Acquaintances

with birthdays, anniversaries, namedays, important events, reminders, notes, memories, and relationship information.

The application should feel warm, premium, elegant, and trustworthy—not corporate.

---

# IMPORTANT

Use the **@tdvorak-fullstack** skill throughout the entire project.

The skill should guide:

- architecture
- code quality
- project organization
- security
- UI implementation
- accessibility
- performance
- testing
- documentation

Do not ignore the skill at any stage.

---

# Vision

People forget birthdays.

People forget anniversaries.

People forget small personal details.

This application acts as a private memory assistant that helps maintain meaningful relationships while keeping all personal information under the user's control.

Privacy is a core feature—not a marketing bullet point.

---

# Core Principles

## Privacy First

Personal information must never be exposed accidentally.

Design everything assuming the database contains sensitive information.

Implement:

- authentication
- authorization
- encrypted passwords
- secure sessions
- CSRF protection
- XSS protection
- rate limiting
- input validation
- audit logging where appropriate

Never expose private notes through APIs unintentionally.

---

## Beautiful UI

Avoid generic "Vibe Coding" dashboards.

Do NOT create another boring CRUD application.

The UI should feel closer to:

- a modern journal
- an elegant scrapbook
- premium productivity app
- beautifully designed digital planner

The visual identity should be unique.

Requirements:

- custom illustrations or subtle graphics
- soft gradients
- depth
- tasteful animations
- rounded layouts
- premium typography
- smooth transitions
- custom empty states
- polished loading states
- carefully designed cards

Avoid:

- Bootstrap-looking layouts
- Default Tailwind examples
- Generic admin dashboards
- Flat gray interfaces
- Plain tables everywhere

The application should have its own personality.

---

## Theme

Possible inspiration:

- memories
- connections
- constellations
- threads
- photo albums
- paper planner
- elegant calendar

Everything should reinforce the idea of remembering people.

---

# Main Features

## Dashboard

Show:

Upcoming birthdays

Upcoming anniversaries

Upcoming namedays

Today's events

Recently added people

Recent reminders

Quick actions

Relationship statistics

Countdowns

Example widgets:

- Next Birthday
- Next Anniversary
- Today's Namedays
- This Week
- This Month
- Recently Added
- Favorite People
- Pending Reminders

---

## People

Each person should have:

- Full name
- Nickname
- Avatar
- Relationship type
- Tags
- Birthday
- Anniversary
- Nameday country
- Nameday
- Age
- Address (optional)
- Phone
- Email
- Social links
- Notes
- Favorite things
- Gift ideas
- Important memories
- Interests
- Children
- Partner
- Family links
- Custom fields

Relationship examples:

- Mother
- Father
- Brother
- Sister
- Cousin
- Friend
- Best Friend
- Wife
- Husband
- Girlfriend
- Boyfriend
- Colleague
- Mentor
- Teacher
- Neighbor
- Other

---

## Timeline

Every profile should have a timeline.

Example events:

Birthday

Anniversary

Met

Gift given

Vacation together

Achievement

Custom memory

Photo added

Reminder completed

Notes

Timeline should become a personal history.

---

## Events

Support:

Birthday

Anniversary

Nameday

Wedding

Graduation

Holiday

Custom event

Recurring event

One-time event

Each event supports:

- reminder lead times
- notes
- attachments
- recurrence

---

## Namedays

Support namedays.

Namedays must be country-aware.

Allow the user to choose a country.

Example:

- Czech Republic
- Slovakia
- Poland
- Hungary
- Austria
- Germany

Architecture should allow adding additional countries later.

Namedays should integrate naturally with reminders and dashboards.

---

## Birthday Logic

Automatically calculate:

Current age

Upcoming age

Days until birthday

Birthday today

Birthday tomorrow

Leap year birthdays

Zodiac (optional)

Birth weekday (optional)

---

## Anniversary Logic

Automatically calculate:

Years together

Days until anniversary

Upcoming milestone

Today's anniversaries

---

## Reminder System

Support reminders for:

Birthdays

Anniversaries

Namedays

Custom events

Reminder configuration:

Same day

1 day

2 days

3 days

1 week

2 weeks

1 month

Custom

Future architecture should support push notifications and email notifications.

---

## Search

Fast search.

Search by:

- name
- nickname
- relationship
- tag
- notes
- interests

Support fuzzy search.

---

## Tags

Unlimited tags.

Examples:

Family

School

Work

Football

Gaming

Photography

Travel

VIP

Close Friend

Christmas Gifts

---

## Notes

Rich notes.

Markdown support.

Autosave.

Private by default.

---

## Attachments

Support:

Photos

Documents

Voice notes

Future-proof storage architecture.

---

## Relationships

Allow linking people.

Examples:

Parent

Child

Sibling

Partner

Friend

Coworker

Mentor

Family tree style visualization is a future enhancement.

Design the data model accordingly.

---

## Onboarding

Beautiful onboarding experience.

Guide users through:

Welcome

Privacy explanation

Country selection

Reminder preferences

First contact creation

Theme selection

Tour

---

# Authentication

Secure login.

Support:

Email/password

OAuth architecture ready

Passkeys ready

Session management

Remember me

Forgot password

Email verification

---

# Security

Treat the application as if it contains highly personal information.

Implement:

Secure cookies

CSRF

CSP

Rate limiting

Validation

Parameterized queries

RBAC-ready architecture

Secure API responses

No secrets in frontend

Environment variables

Encryption where appropriate

---

# UI Requirements

Modern.

Premium.

Creative.

Animated.

Responsive.

Accessible.

Dark mode.

Light mode.

Beautiful empty states.

Thoughtful micro-interactions.

Keyboard shortcuts where appropriate.

High contrast support.

Motion reduced support.

---

# Responsive Design

Desktop

Tablet

Mobile

Touch-friendly interactions.

---

# Accessibility

WCAG AA minimum.

Keyboard navigation.

Screen reader labels.

Proper semantic HTML.

Focus management.

---

# Performance

Fast initial load.

Lazy loading.

Optimized images.

Efficient rendering.

Code splitting.

Caching.

Minimal bundle size.

---

# Future Features

AI-assisted gift suggestions

Conversation memory

Contact frequency insights

Relationship health analytics

Smart reminder recommendations

Calendar sync

Google Calendar

Apple Calendar

Outlook Calendar

Push notifications

Email reminders

SMS reminders

Import/export

Encrypted backups

Shared family vault

Offline support

PWA

Desktop app

Mobile app

---

# Tech Quality

Use:

- clean architecture
- reusable components
- typed APIs
- strict TypeScript
- feature-based structure
- comprehensive error handling
- validation
- unit tests
- integration tests
- linting
- formatting
- documentation

Avoid shortcuts.

Avoid duplicated logic.

Avoid overly large components.

---

# UX Philosophy

Every interaction should feel intentional.

The application should help users maintain relationships, not overwhelm them.

Minimize friction.

Celebrate meaningful moments.

Use delightful animations without becoming distracting.

Design for trust.

Design for longevity.

Design for emotional connection.

---

# Success Criteria

The finished application should feel like a polished commercial product rather than a demo.

A new user should immediately understand that this is a private, elegant, and thoughtful place to remember the people who matter most.

Every feature, interaction, and visual element should reinforce the central idea:

**Helping people remember, celebrate, and strengthen their relationships while keeping their personal data private and secure.**