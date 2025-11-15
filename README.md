<p align="center">
  <img src="icons/icon128.png" alt="JATS Logo" width="128">
</p>


# JATS (Job Application Tracking Software)

**Chrome Extension to log job applications from LinkedIn, Handshake, and UCSD Jacobs Portal into Google Sheets.**  
<span style="color:gray">May work on other sites, but functionality is limited.</span>


## Features

- Automatically extract job information:  
  - Job title  
  - Company name  
  - Job link  
  - Date applied  
  - Login type (LinkedIn, Handshake, Jacobs Portal)  

- Save and reuse your Google Sheet URL for convenience.  
- Provides a **template Google Sheet** to make setup easy.  
- Donation buttons integrated (Buy Me a Coffee, PayPal) without cluttering the UI.  
- Responsive, clean popup UI with intuitive inputs and dropdowns.

---

## Installation

You can install J.A.T.S. directly from the Chrome Web Store:

➡️ **[Chrome Web Store Link](https://chromewebstore.google.com/whatever)**  

---

### Request New Website Support
Want J.A.T.S. to work on another job site?  
Have a feature request or noticed a bug?  

Submit a **[Google Form Request](https://docs.google.com/forms/d/e/1FAIpQLSeR4HpD_-Bg5dmjOml70jW9sVLHK2BCerNlQK-RXs1wrUjySw/viewform?usp=dialog)**.  

Popular requests will be prioritized in future updates.


---

## Local Development (Unpacked Mode)

You can load **J.A.T.S.** locally for development by running it as an unpacked extension.  
**Important:** Google OAuth (used for Google sign-in and Sheets logging) will **not work** automatically in unpacked mode.

### Why OAuth Fails in Unpacked Mode
The published extension uses a Google OAuth Client ID that is tied to the **official Chrome Web Store extension ID**.

When loaded as an unpacked extension, Chrome generates a **different temporary extension ID**, causing Google OAuth to reject the request.  
This is expected behavior for any Chrome extension using Google OAuth.

---

## How to Run Locally (UI Only)

1. Clone the repository:

   ```bash
   git clone https://github.com/MokeyCodes/JATS.git
   ```

2. Open Chrome and visit:

   ```
   chrome://extensions/
   ```

3. Enable **Developer mode**  
4. Click **Load unpacked**  
5. Select the `JATS` folder

This loads the UI, but Google sign-in + Google Sheets logging will not function without your own OAuth credentials.

---

## Enabling Google OAuth Locally (Optional)

If you want Google Sheets logging to work in unpacked mode:

1. Open **Google Cloud Console** → APIs & Services → **Credentials**
2. Create an **OAuth 2.0 Client ID** (Application type: *Chrome Extension*)
3. Find your Local JATS **ID** from **Details** in `chrome://extensions/`
4. Add that ID as the Item ID in the OAuth Client ID creation
5. Replace the `CLIENT_ID` in the code with the new client ID

After this, Google sign-in and Sheets logging will work locally.

---

## Summary

- The UI can be tested locally  
- Google OAuth (Logging Jobs) will **not work** unless you create your own OAuth Client ID  
- The published Chrome Web Store version is not affected

---

## Template Google Sheet

A ready-to-use Google Sheet specifically made for J.A.T.S.:

[📄 JATS Template Sheet](https://docs.google.com/spreadsheets/d/1A27FybT8BFsiGHfN-kyCkZ5JMO502bzirGSX5UFXmHA/copy)

---

## Usage

1. Open the popup by clicking the JATS extension icon.  
2. Enter your **Google Sheet URL** (copy of the provided template).  
3. Select the login type and click **Log Job**.  
4. Your job application info will be automatically added to your sheet.  

---

## Privacy

- All job data is stored in the user’s **own Google Sheet**.  
- A **template** is provided for convenience; no data is sent to external servers.  
- Full privacy policy: [Privacy Policy](https://mokeycodes.github.io/JATS-Privacy-Policy/)

---

## Screenshots

| v1.0.0 | v1.0.1 |
|--------|--------|
| <img src="assets/screenshots/popup-1.0.0.png" alt="v1.0.0" width="300"/> | <img src="assets/screenshots/popup-1.0.1.png" alt="v1.0.1" width="300"/> |

---
For full version history, see [CHANGELOG.md](CHANGELOG.md)
---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
