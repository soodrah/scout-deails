
# Lokal - Hyper-Local Deals & AI Outreach

Lokal is a smart, hyper-local deals application that connects users with nearby discounts and helps business owners grow through AI-driven targeted outreach.

## 🚀 Tech Stack

### Frontend
*   **React:** UI Library (TypeScript).
*   **Vite:** Build tool and development server.
*   **Tailwind CSS:** Utility-first CSS framework for styling.
*   **Lucide React:** Iconography.

### Backend & Data
*   **Supabase:**
    *   **Database:** PostgreSQL with Row Level Security (RLS).
    *   **Auth:** Email/Password and OAuth (Google).
    *   **Storage:** (Optional) For business images.

### Artificial Intelligence (GenAI)
*   **Google Gemini API:** Powered by the `@google/genai` SDK.
    *   **Models:** Uses `gemini-2.5-flash` for high-speed responses.
    *   **Grounding:** Implements **Google Maps Grounding** to verify real-world business locations and **Google Search Grounding** for business research.
    *   **Generative Features:** Creates marketing emails, analyzes deal quality, and generates smart business descriptions.

### Mobile & Deployment
*   **Capacitor:** Wraps the web application for iOS and Android deployment.
*   **Vercel:** Optimized for web deployment with rewrite rules configured in `vercel.json`.

---

## ✨ Key Features

### For Consumers
*   **Location-Based Deals:** Automatically detects city via Geolocation and Gemini Reverse Geocoding.
*   **AI Search:** Ask natural language questions like "Cheap sushi near me" (powered by Gemini + Maps).
*   **Digital Wallet:** Save deals and redeem them via QR codes.

### For Business Owners (Admin)
*   **AI Lead Generation:** Scans the local area for potential business partners.
*   **One-Click Outreach:** Generates personalized cold emails to leads using real-time web data.
*   **Smart Contract Management:** Digital ledger for tracking commissions and sales.
*   **Deal Analytics:** AI critique of deal titles/descriptions to maximize conversion.

---

## 🛠️ Setup & Installation

### 1. Environment Variables
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_KEY=your_google_gemini_api_key
```

*Note: In the current web preview, keys may be hardcoded or injected via import maps.*

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Database Setup
Run the SQL scripts provided in `supabase_schema.sql` and `supabase_fix.sql` in your Supabase SQL Editor to set up the tables and Row Level Security policies.

---

## 📱 Mobile Build (Capacitor)

To build for mobile:

1.  **Build the web assets:**
    ```bash
    npm run build
    ```
2.  **Sync with Capacitor:**
    ```bash
    npx cap sync
    ```
3.  **Open Native IDE:**
    ```bash
    npx cap open ios
    # or
    npx cap open android
    ```
