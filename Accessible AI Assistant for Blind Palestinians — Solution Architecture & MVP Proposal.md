# Accessible AI Assistant for Blind Palestinians

## Solution Architecture & MVP Proposal

### 1. Executive Summary

This project proposes an **Arabic-first AI personal assistant for blind and visually impaired people in Palestine**, delivered through a dedicated React Native mobile application.

The assistant allows users to communicate naturally through voice or text instead of navigating complex menus or visually dependent applications. A user can say or type:

> “Call my wife.”\
> “Send Ahmad a message that I will be late.”\
> “Where am I?”\
> “What is on my calendar today?”\
> “Share my location with my brother.”\
> “Arrange a meeting with Mohammed tomorrow.”\
> “Call my emergency contact.”

The system combines Arabic conversational AI with secure mobile integrations for contacts, telephone calls, messaging, calendars, location and emergency workflows.

The core design principle is:

**The AI interprets what the user wants; a secure policy layer determines what the system is allowed to do; deterministic mobile and backend tools execute the action.**

This prevents the language model from directly controlling sensitive capabilities such as calls, messages, location sharing or appointment modification.

The MVP will prioritize **free and open-source technologies**, free development tools and free service tiers wherever possible. The pilot should avoid paid AI APIs, paid telephony platforms and paid infrastructure unless they become necessary for reliability or scale.

The initial MVP would be piloted with a small group of Palestinian blind users, with those users actively participating in accessibility testing and product design.

---

# 2. Proposed Solution

### User Experience

```text
             Blind User
                 │
        Arabic Voice / Text
                 │
        ┌────────▼────────┐
        │ React Native    │
        │ Mobile App      │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ AI Assistant    │
        │ Arabic Intent + │
        │ Conversation     │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Policy &        │
        │ Permission      │
        │ Engine          │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Secure Tool     │
        │ Layer            │
        └────────┬────────┘
           ┌─────┼───────────────┐
           │     │               │
       Contacts Calendar      Location
       Calling  Messaging     Emergency
```

The React Native application will be the primary user interface and will provide access to device capabilities that cannot be reliably controlled through external messaging platforms.

The application will support:

- Arabic voice input
- Arabic text input
- Screen-reader-compatible controls
- Spoken responses
- Native telephone calls
- Native location access
- Contact management
- Messaging workflows
- Calendar integration
- Emergency contacts

The backend will initially be implemented as a **modular TypeScript/Node.js platform**, using free and open-source components wherever practical.

---

# 3. Arabic AI Assistance

Arabic support is a central requirement rather than a later enhancement.

The assistant should understand:

- Modern Standard Arabic
- Palestinian conversational Arabic
- Common dialect variations
- Informal expressions
- Arabic-English switching
- Different ways of referring to family members and contacts

For example, the following requests should resolve to the same intent:

> “اتصل بزوجتي”\
> “رن على مرتي”\
> “دق على مرتي”\
> “اتصل بمرتي”

The system should also support natural Arabic responses that are concise and suitable for screen readers.

### Free AI approach for the MVP

To keep the MVP free, the project should avoid depending on paid hosted AI APIs during the initial pilot.

Possible approaches include:

- Running open-source Arabic-capable language models locally during development
- Hosting a small open-source model on an existing computer or donated server
- Using free-tier infrastructure where available
- Designing the system with an AI abstraction layer so a stronger hosted model can be added later
- Using deterministic intent classification for the seven MVP capabilities where possible
- Combining rule-based Arabic phrase matching with a local language model

The MVP does not need a fully autonomous general-purpose agent. A controlled assistant supporting seven clearly defined capabilities can use a hybrid approach:

```text
Arabic voice/text
       ↓
Speech-to-text or text input
       ↓
Arabic intent recognition
       ↓
Structured action
       ↓
Policy validation
       ↓
Confirmation
       ↓
Tool execution
```

This approach reduces cost, improves safety and makes the system easier to test.

### Free speech technologies

The MVP can evaluate open-source or locally runnable speech tools for:

- Arabic speech-to-text
- Text-to-speech
- Voice activity detection
- Audio processing

The exact model should be selected after testing Palestinian Arabic speech, pronunciation, background noise and device performance.

---

# 4. MVP — Seven Initial Capabilities

The first pilot should deliberately focus on a small set of high-value, measurable capabilities.

### 1. Contact Calling

User:

> “Call my wife.”

The system resolves the configured contact and asks for confirmation according to the user's security preferences before initiating the call through the mobile device.

The application should use the phone's normal cellular connection. This avoids paid cloud telephony services and does not require the platform to carry or route the call.

### 2. Messaging

User:

> “Send Ahmad a message saying I will arrive 15 minutes late.”

The assistant generates the message, identifies the recipient and requests confirmation before sending.

For the free MVP, messaging should initially use the device's available native messaging capability, subject to Android and iOS permissions and platform restrictions.

The system should not depend on paid SMS APIs during the pilot.

### 3. Current Location

User:

> “Where am I?”

The mobile application obtains the current location and converts it into a human-readable Arabic response.

The MVP should avoid paid map APIs where possible. It can initially provide:

- GPS coordinates
- A basic location description
- OpenStreetMap-based reverse geocoding
- A simple spoken location response

### 4. Location Sharing

User:

> “Send my location to my brother.”

The system obtains the current location and shares it only after authorization and, normally, explicit confirmation.

For the free MVP, location sharing can use:

- A generated map link
- The device's native share sheet
- A selected contact
- A locally generated message

The system should not store continuous location history unless the user explicitly enables it.

### 5. Calendar Assistant

Examples:

> “What do I have today?”

> “What is my next appointment?”

The system can read the user's connected calendar and summarize appointments in an accessible format.

To avoid paid calendar infrastructure, the MVP can initially support:

- The device's local calendar
- Free Google Calendar integration
- Optional Microsoft calendar integration if required by pilot users

Calendar access must use explicit user authorization.

### 6. Calendar Scheduling

Examples:

> “Arrange a meeting with Ahmad tomorrow at 10.”

The assistant checks availability, proposes the appointment and requires confirmation before creating or modifying calendar events.

The MVP should initially support a limited set of operations:

- Create an appointment
- Read existing appointments
- Modify an appointment
- Cancel an appointment

### 7. Emergency Workflow

A dedicated, deterministic emergency workflow provides access to configured emergency contacts and predefined actions.

Emergency operations are **not controlled solely by the language model**. They use explicit rules, permissions, logging and predefined procedures.

The initial free MVP should focus on configured trusted contacts rather than paid emergency call-center integrations. For example:

```text
Emergency request
       ↓
Confirm emergency contact
       ↓
Ask for confirmation when safe
       ↓
Place call or prepare message
       ↓
Share location if authorized
       ↓
Record audit event
```

The application must clearly distinguish between:

- Calling a trusted emergency contact
- Contacting official emergency services
- Sharing location
- Sending an emergency message

These workflows should be validated with local disability organizations and relevant authorities before deployment.

---

# 5. Security & Privacy Architecture

Security is a foundational requirement because this system may perform real-world actions on behalf of a user.

### Principle 1 — AI does not have unrestricted access

The AI cannot directly:

- place arbitrary telephone calls
- send arbitrary messages
- access unrestricted location history
- modify calendars
- share location
- execute emergency actions

Instead, the AI generates a structured request:

```json
{
  "action": "SEND_MESSAGE",
  "recipient": "contact_123",
  "message": "I will arrive 15 minutes late."
}
```

The application then validates the request through a policy engine.

### Principle 2 — Explicit permissions

Each capability has a separate permission:

```text
CONTACT_READ
CALL_CONTACT
SEND_MESSAGE
LOCATION_READ
LOCATION_SHARE
CALENDAR_READ
CALENDAR_WRITE
EMERGENCY_ACTION
```

Users can enable or disable capabilities individually.

### Principle 3 — Risk-based confirmation

Low-risk operations can happen immediately:

> “What is on my calendar?”

Higher-risk operations require confirmation:

> “I am ready to send Ahmad this message. Should I send it?”

High-impact operations use specialized workflows.

The confirmation process should support:

- Arabic voice confirmation
- Arabic text confirmation
- Clear spoken summaries
- Repetition on request
- Cancellation commands
- Timeout and safe-failure behavior

### Principle 4 — Contact aliases

Users should be able to configure aliases such as:

```text
wife → saved contact
doctor → saved contact
brother → saved contact
emergency → predefined contacts
```

The AI should resolve aliases to internal contact IDs rather than inventing telephone numbers.

### Principle 5 — Data minimization

The platform should avoid storing unnecessary sensitive information, particularly:

- continuous precise location
- full conversation history
- unnecessary contact information
- unnecessary personal activity history

Location should normally be requested only when needed.

### Principle 6 — Auditability

Sensitive operations generate an audit record containing:

```text
User
Timestamp
Requested action
Authorized action
Permission decision
Confirmation
Execution result
```

This supports security monitoring, incident investigation and future institutional certification.

### Principle 7 — Accessibility by design

The product will be co-designed and tested with blind users rather than merely tested after development.

Responses should be optimized for:

- screen readers
- concise audio interaction
- Arabic conversational usage
- low cognitive load
- clear confirmation prompts
- predictable navigation
- offline or low-connectivity conditions where possible

---

# 6. Technical Architecture

### Initial Architecture

```text
React Native Mobile App
          │
          ▼
Local Accessibility and Device Layer
          │
          ├── Voice Input
          ├── Text Input
          ├── Text-to-Speech
          ├── Contacts
          ├── Phone Calls
          ├── Messaging
          ├── Location
          └── Native Calendar
          │
          ▼
API / Conversation Gateway
          │
          ▼
Arabic AI / Intent Runtime
          │
          ▼
Intent and Tool Selection
          │
          ▼
Policy and Permission Engine
          │
          ▼
Secure Tool Layer
 ┌────────┼─────────┬──────────┐
 │        │         │          │
Calls  Messages  Calendar   Location
 │        │         │          │
 └────────┴─────────┴──────────┘
          │
     PostgreSQL
          │
    Audit / Metrics
```

### Recommended initial technology

**Mobile application**

- React Native
- Android-first pilot if resources are limited
- React Native Accessibility APIs
- Native Android modules where required
- Android Text-to-Speech and speech services where available
- Native location and telephone integration
- Local encrypted storage for user preferences and permissions

**Backend**

- Node.js
- TypeScript
- PostgreSQL
- REST APIs
- Redis only if needed for short-lived sessions
- Modular monolith architecture
- Free or self-hosted deployment during the MVP

**AI**

- Open-source Arabic-capable language model where feasible
- Local or self-hosted inference during the MVP
- Rule-based intent recognition for high-risk or clearly defined commands
- LangGraph.js or a lightweight custom orchestration layer
- Model abstraction layer for future migration to stronger hosted models

**Free/open-source infrastructure options**

- PostgreSQL
- OpenStreetMap
- Open-source speech and language models
- Self-hosted backend
- GitHub or another free source-control platform
- Free CI/CD tiers
- Free development and testing tools
- Existing donated or institutional servers
- Free cloud tiers where available

The project should not assume that free tiers are permanent or sufficient for production. The MVP should therefore be designed to run locally or on donated infrastructure, with a clear transition plan for future funding.

The first release should remain a **modular monolith**, avoiding premature microservices and Kubernetes complexity.

---

# 7. Estimated MVP Team

A small team can build and pilot the first version.

### Core team

**1 Solution Architect / Technical Lead**

- architecture
- security model
- AI/tool orchestration
- mobile/backend boundaries
- technical governance
- open-source and cost-control strategy

**1 Backend / AI Engineer**

- Arabic intent processing
- agent implementation
- tool integrations
- policy engine
- APIs
- database
- local model integration

**1 React Native / Mobile Engineer**

- React Native application
- Android device integrations
- accessibility
- location and calling capabilities
- permissions
- offline and low-connectivity behavior

**1 QA / Accessibility Engineer**

- functional testing
- accessibility testing
- blind-user testing
- Arabic interaction testing
- security and failure scenarios
- device compatibility

**Part-time Product / Accessibility Lead**

- user research
- pilot coordination
- requirements
- NGO/government communication
- user training
- impact measurement

### Optional specialist support

Part-time expertise may be added for:

- security/privacy
- Arabic UX and conversational design
- disability accessibility
- legal/regulatory review
- DevOps and self-hosting
- speech technology
- emergency-service coordination

A practical MVP can therefore begin with approximately **4 full-time-equivalent technical/product staff plus part-time specialists**.

A volunteer, university or NGO partnership could reduce the initial cash requirement by contributing:

- development time
- testing devices
- hosting
- accessibility expertise
- pilot recruitment
- translation and Arabic language review

---

# 8. MVP Delivery Approach

### Phase 1 — Discovery & Co-Design

Work directly with blind Palestinian users to identify:

- highest-value daily tasks
- Arabic terminology and dialect requirements
- emergency scenarios
- accessibility barriers
- acceptable confirmation behavior
- privacy expectations
- device availability
- connectivity limitations
- preferred voice and text interaction

**Output:** validated requirements, accessibility design and pilot plan.

### Phase 2 — Free Technology Validation

Before building the full application, test:

- Arabic speech-to-text quality
- Arabic text-to-speech quality
- local model performance
- Android calling permissions
- native messaging limitations
- location accuracy
- calendar access
- offline behavior
- performance on low-cost Android devices

**Output:** confirmed free/open-source technology stack and identified limitations.

### Phase 3 — MVP Development

Implement the seven capabilities, authentication, permissions, audit logging and core accessibility functionality.

The MVP should initially support a controlled set of Arabic intents rather than unrestricted conversation.

**Output:** functioning pilot application.

### Phase 4 — Controlled Pilot

Pilot with approximately 10–30 users.

Measure:

- task completion rate
- time required to complete tasks
- incorrect-action rate
- confirmation/error rate
- Arabic recognition accuracy
- speech-to-text accuracy
- accessibility issues
- user satisfaction
- reliability
- security incidents
- device and connectivity failures

### Phase 5 — Expansion

After successful validation:

- larger user population
- improved Arabic voice interaction
- additional Android device support
- iOS support if justified
- SMS/WhatsApp support where technically and legally feasible
- transportation/navigation
- medical appointment assistance
- reminders
- public-service integrations
- additional accessibility features

---

# 9. Government / NGO / Donor Value Proposition

This project is not simply an AI chatbot.

It is an **assistive technology and digital inclusion platform** intended to increase independence and access to everyday services for blind Palestinians.

### Social Impact

The platform can help users perform everyday activities that may otherwise require assistance from family members or caregivers.

Potential impact areas include:

**Independence**\
Users can perform common communication and organizational tasks without relying on another person.

**Digital Inclusion**\
AI converts complex digital services into natural-language interactions.

**Accessibility**\
The system creates an interface designed around blind users rather than expecting users to adapt to visually oriented applications.

**Emergency Accessibility**\
Configured emergency workflows can provide faster access to trusted contacts.

**Local Language Support**\
Arabic-first interaction makes advanced digital assistance more accessible to local users.

**Affordability**\
A free MVP based on open-source technologies can reduce barriers for users and allow institutions to evaluate impact before committing to larger infrastructure costs.

### Why institutional support is valuable

Government and NGO participation can provide:

- pilot-user recruitment
- accessibility expertise
- institutional credibility
- partnerships with telecom and service providers
- free or donated hosting
- testing devices
- cybersecurity and privacy oversight
- integration with relevant public services
- long-term sustainability
- support for users who cannot afford smartphones or connectivity

### Institutional partnership opportunities

Potential partners could contribute through:

- disability organizations
- universities and computer science departments
- ministries responsible for social development or telecommunications
- local technology companies
- telecom operators
- international development organizations
- accessibility and humanitarian NGOs
- donor-funded digital inclusion programs

---

# 10. Proposed Success Metrics

The pilot should be evaluated using measurable outcomes rather than AI performance alone.

```text
≥ 90% successful completion for supported common tasks
< 5% unintended action rate
> 90% successful intent recognition for defined MVP scenarios
High Arabic speech and text interaction satisfaction
High accessibility satisfaction among pilot users
Zero unauthorized sensitive actions
Measurable reduction in assistance required for selected tasks
High reliability of critical workflows
No unresolved critical privacy or security incidents
Successful operation on selected low-cost Android devices
```

Targets should be finalized after the discovery phase and baseline testing.

The evaluation should compare the user's experience before and after using the assistant, including:

- time required to complete tasks
- number of tasks requiring assistance
- confidence and perceived independence
- frequency of successful communication
- ability to manage appointments
- ability to access location and emergency contacts

---

# 11. Long-Term Vision

The MVP is the foundation for a broader **Palestinian Accessible Digital Assistant**.

Future capabilities could include:

- voice-first conversations
- navigation assistance
- public transportation information
- hospital and clinic appointments
- government service access
- medication and reminder support
- public-service information
- local business discovery
- trusted emergency services
- Arabic voice interaction
- integration with accessibility organizations
- support for additional disabilities
- offline and low-connectivity operation
- integration with local Palestinian digital services

The long-term objective is to create a **trusted accessibility layer between blind users and digital services**, while maintaining strict control over privacy, security and real-world actions.

---

## Funding / Partnership Request

We propose an initial **co-designed, free-to-users pilot with Palestinian blind users**, followed by measurable technical and social-impact evaluation.

The program can be supported as a partnership between:

**Technology Team + Blind/Disability Organizations + Government/NGO/Donor Partner**

The technology team provides architecture, AI engineering and product development; blind users define and validate accessibility requirements; institutional partners provide funding, access, governance, testing resources and pathways to scale.

The MVP will prioritize free and open-source technologies, local or donated infrastructure and the user's own mobile network for calls and messaging. This keeps the initial pilot accessible and reduces dependency on paid third-party platforms.

### Core proposition

> **Give blind Palestinians a safe, free and Arabic-first way to interact with digital services using natural conversation—without requiring them to navigate complex visual interfaces.**

This project is technically achievable with existing mobile, open-source AI and cloud technologies. The key challenge is not whether the AI can understand the user; it is building the surrounding **security, accessibility, trust and execution architecture** correctly.
