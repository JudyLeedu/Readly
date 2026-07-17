# ☕️ Readly

> An immersive AI reading companion built with a geek's spirit and a Product Manager's empathy.
> Say goodbye to mediocre machine translations. Readly extracts the core value and high-dimensional insights from long-form articles with surgical precision.

## ✨ Core Philosophy
- **One Card = One Insight**: We abandon coarse paragraph summaries. Instead, we use a "dimensional strike" approach where each card delivers exactly one sharp, focused insight.
- **Pinpoint Traceability**: The `[Locate Original Text]` button at the bottom of each card ensures you never get lost, jumping with 100% accuracy to the exact sentence that sparked the insight.
- **Extreme Minimalism**: With a warm, organic color palette (Deep Mocha & Light Caramel) and adaptive typography, we fiercely defend the aesthetics of minimalism and white space.
- **Knowledge Loop**: Supports mouse-highlight extraction `[YOUR TAKEAWAY]`, intertwining your personal thoughts with AI insights on the exact same chronological timeline.

---

## 📦 Installation & Setup

Since this project operates on a completely free **BYOK (Bring Your Own Key)** model and is not listed on the Chrome Web Store, you will need to install it via "Developer mode".

### 1. Install the Extension
1. Go to the GitHub Releases page and download the latest `.zip` package (or simply download the `build/chrome-mv3-prod/` folder from the root of this project).
2. Extract the `.zip` file into a dedicated folder.
3. Open your Chrome browser and navigate to `chrome://extensions/`.
4. Toggle on **"Developer mode"** in the top right corner.
5. Click **"Load unpacked"** in the top left corner and select the folder you just extracted.
6. Success! You can now find the coffee-colored Readly icon in your Chrome extensions menu.

### 2. Configure Your LLM API Key
To bring your reading companion to life, you need to provide your own LLM key:
1. Right-click the Readly icon in the Chrome toolbar and select **"Options"**.
2. Fill in the required information in the settings page:
   - **Model Name**:
     - For official DeepSeek API, enter `deepseek-chat`
     - For Volcengine (ByteDance Cloud), enter your specific endpoint ID (e.g., `ep-20241234-xxx`)
   - **API Key**: Enter your valid API key.
3. Click "Save Configuration". Your credentials are stored strictly in your local browser cache and are absolutely secure.

### 3. Start Immersive Reading
1. Open any deep, long-form blog post (e.g., GatesNotes, Medium, Substack).
2. Click the Readly extension icon to summon the side panel.
3. Click **"☕️ 开启阅读时光 (Start Reading Time)"**.
4. Take a sip of coffee and enjoy the high-dimensional insights extracted by AI.
5. **Highlight & Record**: While reading, select any text that resonates with you, click the floating `[+]` icon, and write down your exclusive takeaway.

---

## 🛠 Tech Stack
- [Plasmo](https://docs.plasmo.com/) (Browser Extension Framework)
- React 18 + TailwindCSS
- `@mozilla/readability` (Core Extraction Engine)
- DeepSeek V3 (LLM)

## 🔒 Privacy Statement
Readly strictly adheres to a "100% Local" privacy principle:
1. The extension extracts the main content of the web page you are currently viewing using client-side JavaScript only.
2. The extracted text is sent directly to your configured third-party LLM provider. It never passes through any of our servers.
3. Your API Key, history summaries, and highlight records are all stored locally in `chrome.storage.local`.
4. We do not collect, upload, or analyze any of your browsing behavior.

---
*Made with ❤️ by Judy.*