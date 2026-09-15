BikroyBot -AI Social Commerce Automation System


BikroyBot is a 100% free-tier, automated AI sales agent designed for Bangladeshi e-commerce Facebook Pages and Messenger. It integrates Google Gemini Multimodal AI (gemini-3.6-flash), Supabase Realtime Database, and Meta Graph API to handle customer product inquiries, visual product identification from images, and complete multi-step order booking automatically.

 Key Features
 Gemini Multimodal AI (gemini-3.6-flash): Understands Banglish/Bangla customer intent, answers pricing/stock queries, and identifies exact products from customer-uploaded photo screenshots.
Automated Order State Machine: Guided multi-step checkout flow collecting:
Customer Full Name
11-Digit BD Phone Number (with validation)
Delivery Address & Automated Delivery Charge calculation (Inside Dhaka: ৳80, Outside Dhaka: ৳150)
Instant Order Confirmation & Database logging.
 Auto-Reset & Greeting Handler: Resetting active order flow instantly when customer types "hi", "salam", or "cancel".
 Real-Time Admin Dashboard: Built-in web dashboard for:
Instant Chat Simulation & Product Image Vision Testing
Real-time Product Catalog Management
Supabase Live Orders Feed & Customer Inbox
Meta Messenger Webhook: Official Meta Graph API integration (v19.0) supporting real-time event webhooks for Facebook Pages.
 100% Free Infrastructure: Hosted on Render Free Web Service + Supabase Free Tier + Gemini Free Tier API.
 Tech Stack & Architecture
Backend Framework: Node.js, Express.js, TypeScript
Database: Supabase (PostgreSQL with Realtime capabilities)
AI & Computer Vision Engine: Google Gemini REST API (gemini-3.6-flash, gemini-3.5-flash fallback chain)
Integrations: Meta Graph API (Facebook Messenger Webhook API v19.0)
Hosting Platform: Render Cloud Platform


+-------------------+       +-----------------------+       +------------------------+
| Facebook Customer | <---> |  Meta Graph Webhook   | <---> |   BikroyBot Express    |
|   (Messenger)     |       |   /api/v1/webhook     |       |  (Render Hosted Server)|
+-------------------+       +-----------------------+       +-----------+------------+
                                                                        |
                                            +---------------------------+---------------------------+
                                            |                                                       |
                                            v                                                       v
                                +-----------------------+                               +-----------------------+
                                |  Google Gemini REST   |                               |  Supabase Database    |
                                | (gemini-3.6-flash AI) |                               |   (Orders, Products,  |
                                +-----------------------+                               |     Customers Data)   |
                                                                                        +-----------------------+
 Repository Structure


bikroybot/
├── src/
│   ├── config/
│   │   └── env.ts                 # Environment variable configurations
│   ├── routes/
│   │   ├── apiRoutes.ts           # Admin dashboard REST API endpoints
│   │   └── webhookRoutes.ts       # Meta Facebook Messenger webhook endpoints
│   ├── services/
│   │   ├── geminiService.ts       # Gemini 3.6 Flash NLU & Vision processing
│   │   ├── metaService.ts         # Meta Graph API message sender service
│   │   ├── orderStateMachine.ts   # Order checkout state machine logic
│   │   └── supabaseService.ts     # Supabase DB operations & queries
│   └── index.ts                   # Express app server entry point
├── public/
│   └── index.html                 # Admin Dashboard & Chat Simulator frontend
├── dist/                          # Compiled TypeScript production output
├── supabase_schema.sql            # Supabase SQL table schemas & sample data
├── package.json
└── tsconfig.json
🚀 Getting Started (Local Development)
1. Prerequisites
Node.js (v18 or higher)
npm or yarn
Supabase Account & Project Key
Google Gemini API Key
2. Installation & Setup
Clone the repository:

bash


git clone https://github.com/Sabbirhossansani/bikroybot.git
cd bikroybot
Install dependencies:

bash


npm install
Configure Environment Variables: Create a .env file in the root directory:

env


PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_google_gemini_api_key
META_VERIFY_TOKEN=your_meta_webhook_verify_token
META_PAGE_ACCESS_TOKEN=your_facebook_page_access_token
DELIVERY_FEE_DHAKA=80
DELIVERY_FEE_OUTSIDE=150
Setup Database: Execute the supabase_schema.sql script inside your Supabase SQL Editor to initialize products, customers, messages, and orders tables.

Run in Development Mode:

bash


npm run dev
Open http://localhost:3000 in your browser to view the Admin Dashboard and Chat Simulator.

Build for Production:

bash


npm run build
npm start
📡 API Endpoints Summary
Method	Endpoint	Description
GET	/health	Server health check endpoint
GET	/api/v1/webhook	Meta Webhook token verification endpoint
POST	/api/v1/webhook	Incoming Meta Facebook Messenger event receiver
GET	/api/products	Retrieve live store products from database
POST	/api/products	Add a new product to store catalog
GET	/api/orders	Fetch confirmed customer orders
POST	/api/chat-simulate	Simulate AI chat response in admin dashboard
 License
This project is licensed under the MIT License.

Developed with ❤️ by Sabbir Hossan Sani

