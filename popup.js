// popup.js (replace / merge with your current popup.js)

// === DOM references ===
const logButton = document.getElementById("logJob");
const loginSelect = document.getElementById("loginSelect");
const sheetUrlInput = document.getElementById("sheetInput");
const saveCheckbox = document.getElementById("saveLinkCheckbox");
const signInStatus = document.getElementById("signInStatus");
const signInBtn = document.getElementById("signInBtn");
const jobStatusDiv = document.getElementById("jobStatus");

// === OAuth scope ===
const SCOPES = "https://www.googleapis.com/auth/drive.file";

// === Extract Sheet ID from URL ===
function extractSheetId(url) {
  const match = url && url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// === Promise wrappers for chrome.storage.local ===
function getStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}
function setStorage(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}
function removeStorage(key) {
  return new Promise((resolve) => chrome.storage.local.remove(key, resolve));
}

// === Get OAuth token ===
async function getToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || "No token received"));
      } else {
        resolve(token);
      }
    });
  });
}

// === Update sign-in UI ===
async function updateSignInStatus() {
  try {
    const token = await getToken(false);
    signInStatus.textContent = "✅ Signed In";
    signInStatus.className = "signed-in";
    signInBtn.style.display = "none";
    return token;
  } catch {
    signInStatus.textContent = "❌ Not signed in";
    signInStatus.className = "not-signed-in";
    signInBtn.style.display = "inline-block";
    return null;
  }
}

// === Template details ===
const TEMPLATE_TITLE = "JATS Job Application Tracker";
const TEMPLATE_SHEET_NAME = "Applications";
const TEMPLATE_HEADERS = [
  "Date Applied",
  "Position/Program",
  "Company/Organization",
  "Hiring Manager",
  "Link",
  "Login Info",
  "Connections",
  "Status",
  "Date Updated"
];

// Dropdown options (yours, including the additions)
const STATUS_DROPDOWN_OPTIONS = [
  "Applied",
  "Phone Interview",
  "Rejected",
  "Online Assessment",
  "Zoom/In Person Interview",
  "Follow Up Sent",
  "Hired",
  "Finalist; not hired",
  "Performance Task"
];

// === Create new templated Google Sheet ===
// === Create new templated Google Sheet ===
// === Create new templated Google Sheet with title + description + conditional formatting ===
async function createTemplateSheet() {
  try {
    let token = await getToken(false).catch(() => null);
    if (!token) token = await getToken(true);
    if (!token) throw new Error("Google sign-in required");

    // 1) Create blank spreadsheet
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title: TEMPLATE_TITLE }, sheets: [{ properties: { title: TEMPLATE_SHEET_NAME } }] })
    });
    const sheetData = await createRes.json();
    if (!createRes.ok) throw new Error(sheetData.error?.message || "Failed to create sheet");

    const sheetId = sheetData.spreadsheetId;
    const firstSheetId = sheetData.sheets[0].properties.sheetId;

    // 2) Header row (navy blue #345995 with white bold text)
    const headerRowRequest = {
      updateCells: {
        start: { sheetId: firstSheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{
          values: TEMPLATE_HEADERS.map(h => ({
            userEnteredValue: { stringValue: h },
            userEnteredFormat: { 
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, // white text
              backgroundColor: { red: 52/255, green: 89/255, blue: 149/255 }, // navy
              horizontalAlignment: "CENTER",
              verticalAlignment: "MIDDLE"
            }
          }))
        }],
        fields: "userEnteredValue,userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment)"
      }
    };

    // 3) Description row (white bg, black text, fontSize 10, wrap)
    const descriptionTexts = [
      "On what date did you apply for this position?",
      "What is the title of the position/program?",
      "What is the name of the company or organization?",
      "If you know, who is responsible for hiring this role?",
      "Include the direct link to the job description",
      "How to access the Link?",
      "Who can you reach out to about this role?",
      "Where are you in the process for this role? (e.g., Applied, Phone Interview)",
      "Update the date every time you update the status"
    ];
    const descriptionRowRequest = {
      updateCells: {
        start: { sheetId: firstSheetId, rowIndex: 1, columnIndex: 0 },
        rows: [{
          values: descriptionTexts.map(text => ({
            userEnteredValue: { stringValue: text },
            userEnteredFormat: { textFormat: { fontSize: 10, foregroundColor: { red:0, green:0, blue:0 } }, wrapStrategy: "WRAP", horizontalAlignment:"LEFT" }
          }))
        }],
        fields: "userEnteredValue,userEnteredFormat(textFormat,wrapStrategy,horizontalAlignment)"
      }
    };

    // 4) Row heights
    const row0Height = { updateDimensionProperties: { range: { sheetId: firstSheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 30 }, fields: "pixelSize" } };
    const row1Height = { updateDimensionProperties: { range: { sheetId: firstSheetId, dimension: "ROWS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 60 }, fields: "pixelSize" } };

    // 5) Column widths
    const columnWidths = [190, 670, 200, 200, 270, 250, 200, 200, 190];
    const colRequests = columnWidths.map((w, idx) => ({
      updateDimensionProperties: {
        range: { sheetId: firstSheetId, dimension: "COLUMNS", startIndex: idx, endIndex: idx + 1 },
        properties: { pixelSize: w },
        fields: "pixelSize"
      }
    }));

    // 6) Freeze top 2 rows
    const freezeHeaderRequest = {
      updateSheetProperties: {
        properties: { sheetId: firstSheetId, gridProperties: { frozenRowCount: 2 } },
        fields: "gridProperties.frozenRowCount"
      }
    };

    // 7) Status dropdown (column H / index 7)
    const validationRequest = {
      setDataValidation: {
        range: { sheetId: firstSheetId, startRowIndex: 2, endRowIndex: 1000, startColumnIndex: 7, endColumnIndex: 8 },
        rule: { condition: { type: "ONE_OF_LIST", values: STATUS_DROPDOWN_OPTIONS.map(v => ({ userEnteredValue: v })) }, showCustomUi:true, strict:false }
      }
    };

    // 8) Conditional formatting for Status dropdown colors
    const statusColors = {
      "Applied": { red:0.831, green:0.93, blue:0.737 },          // light green
      "Phone Interview": { red:1, green:1, blue:0.6 },    // yellow
      "Rejected": { red:1, green:0.6, blue:0.6 },         // red/pink
      "Online Assessment": { red:0.8, green:0.9, blue:1 },// light blue
      "Zoom/In Person Interview": { red:0.99, green:0.95, blue:0.93 }, // light gray
      "Follow Up Sent": { red:0.9, green:0.8, blue:0.95 },  // purple
      "Hired": { red:0.6, green:1, blue:0.6 },           // green
      "Finalist; not hired": { red:0.95, green:0.85, blue:0.8 },
      "Performance Task": { red:0.03, green:0.32, blue:0.65 } // Blue
    };
    const cfRequests = Object.entries(statusColors).map(([status, color]) => ({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId: firstSheetId, startRowIndex: 2, endRowIndex: 1000, startColumnIndex: 7, endColumnIndex: 8 }],
          booleanRule: { condition: { type: "TEXT_EQ", values: [{ userEnteredValue: status }] }, format: { backgroundColor: color } }
        },
        index: 0
      }
    }));

    // 9) Batch update
    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          headerRowRequest,
          descriptionRowRequest,
          row0Height,
          row1Height,
          ...colRequests,
          freezeHeaderRequest,
          validationRequest,
          ...cfRequests
        ]
      })
    });

    const batchData = await batchRes.json();
    if (!batchRes.ok) throw new Error(batchData.error?.message || "Failed to apply template");

    // Save locally
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    await setStorage({ savedSheetLink: sheetUrl });
    sheetUrlInput.value = sheetUrl;
    saveCheckbox.checked = true;

    jobStatusDiv.textContent = `✅ Template sheet created!`;
    jobStatusDiv.classList.add("show");
    setTimeout(() => { jobStatusDiv.classList.remove("show"); jobStatusDiv.textContent = ""; }, 5000);

    return { sheetId, sheetUrl, firstSheetId };
  } catch (err) {
    console.error("createTemplateSheet:", err);
    jobStatusDiv.textContent = "❌ Failed to create template: " + err.message;
    jobStatusDiv.classList.add("show");
    setTimeout(() => { jobStatusDiv.classList.remove("show"); jobStatusDiv.textContent = ""; }, 5000);
    throw err;
  }
}




// === Ensure a template sheet exists, auto-create if not ===
async function ensureSheetExists() {
  // If savedSheetLink exists, return its sheetId
  const stored = await getStorage(["savedSheetLink"]);
  if (stored.savedSheetLink) {
    const id = extractSheetId(stored.savedSheetLink);
    if (id) return id;
  }
  // Otherwise create one
  const created = await createTemplateSheet();
  return created.sheetId;
}

// === Append row & color Login Type cell (with retry on 404) ===
async function appendRow(sheetId, row, retry = true) {
  try {
    let token = await getToken(false).catch(() => null);
    if (!token) token = await getToken(true);

    // --- Step 1: Get first sheet name and sheetId ---
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      // Convert 404 to a nicer error
      const msg = metaData.error?.message || "Cannot access this sheet. Make sure it's created by the extension or accessible.";
      throw new Error(msg);
    }

    const firstSheetName = metaData.sheets[0].properties.title;
    const sheetIdNum = metaData.sheets[0].properties.sheetId;

    // --- Step 2: Append the row ---
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(firstSheetName)}:append?valueInputOption=USER_ENTERED`;
    const appendRes = await fetch(appendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [row] })
    });
    const appendData = await appendRes.json();
    if (!appendRes.ok) throw new Error(appendData.error?.message || "Unknown error");

    // --- Step 3: Determine row index for formatting ---
    const updatedRange = appendData.updates?.updatedRange || "";
    const match = updatedRange.match(/!(?:[A-Z]+)(\d+):/);
    const rowIndex = match ? parseInt(match[1], 10) - 1 : null;

    // --- Step 4: Determine colors ---
    const loginColors = {
      "LinkedIn": { red: 0.79, green: 0.85, blue: 0.97 },
      "Handshake": { red: 0.83, green: 0.98, blue: 0.33 },
      "Apple ID": { red: 0.60, green: 0.60, blue: 0.60 },
      "Google Email": { red: 0.26, green: 0.52, blue: 0.96 },
      "Jacobs Portal": { red: 0.85, green: 0.69, blue: 0.85 }
    };

    const requests = [];

    if (rowIndex !== null) {
      // --- Reset company cell style first (column C index 2) ---
      requests.push({
        repeatCell: {
          range: { sheetId: sheetIdNum, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 2, endColumnIndex: 3 },
          cell: { userEnteredFormat: { textFormat: { bold: false, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
          fields: "userEnteredFormat.textFormat"
        }
      });

      // --- Apply red + bold only if no company found ---
      if (row[2] === "No Company Found") {
        requests.push({
          repeatCell: {
            range: { sheetId: sheetIdNum, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 2, endColumnIndex: 3 },
            cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: { red: 1, green: 0, blue: 0 } } } },
            fields: "userEnteredFormat.textFormat"
          }
        });
      }

      // --- Format loginInfo cell (column F / index 5) ---
      const loginFormat = loginColors[row[5]];
      if (loginFormat) {
        requests.push({
          repeatCell: {
            range: { sheetId: sheetIdNum, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 5, endColumnIndex: 6 },
            cell: { userEnteredFormat: { backgroundColor: loginFormat, horizontalAlignment: "CENTER", textFormat: { bold: true } } },
            fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)"
          }
        });
      }
    }

    // --- Step 5: Send batchUpdate if needed ---
    if (requests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests })
      });
    }

    // --- Step 6: Non-blocking success notification ---
    jobStatusDiv.textContent = "🤑 Job logged successfully! 💰";
    jobStatusDiv.classList.add("show");
    setTimeout(() => {
      jobStatusDiv.classList.remove("show");
      jobStatusDiv.textContent = "";
    }, 3000);

    return appendData;
  } catch (err) {
    console.error("appendRow error:", err);
    // If it's a not-found / permission error and retry is allowed, recreate template and retry once
    const msg = err.message || "";
    if (retry && (msg.includes("requested entity was not found") || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("Cannot access"))) {
      try {
        jobStatusDiv.textContent = "⚠️ Sheet access failed — creating a new template and retrying...";
        jobStatusDiv.classList.add("show");
        await createTemplateSheet();
        // retrieve saved id and retry once
        const stored = await getStorage(["savedSheetLink"]);
        const newId = extractSheetId(stored.savedSheetLink);
        if (newId) return await appendRow(newId, row, false);
      } catch (createErr) {
        console.error("Retry creation failed:", createErr);
      } finally {
        setTimeout(() => { jobStatusDiv.classList.remove("show"); jobStatusDiv.textContent = ""; }, 4000);
      }
    }

    jobStatusDiv.textContent = "❌ Failed to log job: " + (err.message || "Unknown error");
    jobStatusDiv.classList.add("show");
    setTimeout(() => {
      jobStatusDiv.classList.remove("show");
      jobStatusDiv.textContent = "";
    }, 5000);
    throw err;
  }
}

// === Extract job info from active tab ===
async function extractJobInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const waitForElement = (selector, timeout = 3000) =>
        new Promise(resolve => {
          const start = Date.now();
          const check = () => {
            const el = document.querySelector(selector);
            if (el) resolve(el);
            else if (Date.now() - start > timeout) resolve(null);
            else requestAnimationFrame(check);
          };
          check();
        });

      return (async () => {
        await waitForElement("h1");
        const jobTitle = document.querySelector("h1")?.innerText ||
                         document.querySelector(".top-card-layout__title")?.innerText ||
                         document.querySelector("h2")?.innerText ||
                         "No title found";

        let company = "No Company Found";
        const url = window.location.href;

        if (url.includes("linkedin.com")) {
          const links = Array.from(document.querySelectorAll("a[href*='/company/']"));
          for (const link of links) {
            const text = link.innerText.trim();
            if (text) { company = text; break; }
            const span = link.querySelector("span");
            if (span && span.innerText.trim()) { company = span.innerText.trim(); break; }
          }
        } else if (url.includes("joinhandshake.com")) {
          const jobDetailsContainer = document.querySelector('[data-hook="job-details-page"]');
          if (jobDetailsContainer) {
            const companyDiv = jobDetailsContainer.querySelector('div');
            if (companyDiv) {
              const textEls = Array.from(companyDiv.querySelectorAll('*'))
                .filter(el => el.innerText.trim().length > 0);
              if (textEls.length > 0) {
                company = textEls[0].innerText.trim().split("\n")[0];
              }
            }
          }
        } else if (url.includes("jacobsschool-ucsd.12twenty.com")) {
          const companyLink = document.querySelector("a[ng-if='$ctrl.canViewEmployerProfile']");
          if (companyLink) company = companyLink.innerText.trim();
        }

        return {
          jobTitle,
          company,
          link: url,
          dateApplied: new Date().toLocaleDateString()
        };
      })();
    }
  });

  return results[0].result;
}

// === Save/restore Google Sheet URL UI sync (still allow user to see the URL) ===
(async function initSavedSheetUI() {
  const result = await getStorage(["savedSheetLink"]);
  if (result.savedSheetLink) {
    sheetUrlInput.value = result.savedSheetLink;
    saveCheckbox.checked = true;
  } else {
    // Auto-create template sheet if missing (Option A)
    try {
      await ensureSheetExists();
      const res = await getStorage(["savedSheetLink"]);
      if (res.savedSheetLink) sheetUrlInput.value = res.savedSheetLink;
    } catch (e) {
      // creation failed but we continue (user can press log and sign-in will be prompted)
      console.warn("Initial auto-creation failed:", e);
    }
  }
})();

// Keep UI-driven save behavior (user can uncheck if they want to remove saved link)
saveCheckbox.addEventListener("change", () => {
  if (saveCheckbox.checked) {
    if (sheetUrlInput.value && extractSheetId(sheetUrlInput.value)) {
      chrome.storage.local.set({ savedSheetLink: sheetUrlInput.value.trim() });
    } else {
      // If no valid URL, create template now
      createTemplateSheet();
    }
  } else {
    chrome.storage.local.remove("savedSheetLink");
  }
});

sheetUrlInput.addEventListener("input", () => {
  if (saveCheckbox.checked) chrome.storage.local.set({ savedSheetLink: sheetUrlInput.value.trim() });
});

// === Sign In button ===
signInBtn.addEventListener("click", async () => {
  try {
    await getToken(true);
    await updateSignInStatus();
  } catch (err) {
    jobStatusDiv.textContent = "❌ Sign in failed: " + err.message;
    jobStatusDiv.classList.add("show");
    setTimeout(() => {
      jobStatusDiv.classList.remove("show");
      jobStatusDiv.textContent = "";
    }, 5000);
  }
});

// === Log Job button ===
logButton.addEventListener("click", async () => {
  try {
    const token = await updateSignInStatus();
    if (!token) {
      jobStatusDiv.textContent = "⚠️ Please sign in with Google first.";
      jobStatusDiv.classList.add("show");
      setTimeout(() => {
        jobStatusDiv.classList.remove("show");
        jobStatusDiv.textContent = "";
      }, 4000);
      return;
    }

    // Ensure a sheet exists (auto-create if needed)
    const sheetId = await ensureSheetExists();
    if (!sheetId) {
      jobStatusDiv.textContent = "❌ Unable to create or access a Google Sheet.";
      jobStatusDiv.classList.add("show");
      setTimeout(() => { jobStatusDiv.classList.remove("show"); jobStatusDiv.textContent = ""; }, 4000);
      return;
    }

    const jobInfo = await extractJobInfo();

    if (loginSelect.value === "Default") {
      const url = jobInfo.link;
      if (url.includes("linkedin.com")) jobInfo.loginInfo = "LinkedIn";
      else if (url.includes("joinhandshake.com")) jobInfo.loginInfo = "Handshake";
      else if (url.includes("jacobsschool-ucsd.12twenty.com")) jobInfo.loginInfo = "Jacobs Portal";
      else jobInfo.loginInfo = "Google Email";
    } else jobInfo.loginInfo = loginSelect.value;

    const newRow = [
      jobInfo.dateApplied,
      jobInfo.jobTitle || "No title",
      jobInfo.company || "No Company Found",
      "",
      jobInfo.link || "No link",
      jobInfo.loginInfo,
      "", // Connections
      "Applied", // default Status when logging
      jobInfo.dateApplied // Date Updated initially same as Date Applied
    ];

    await appendRow(sheetId, newRow);
  } catch (err) {
    console.error("Log button error:", err);
    // appendRow already handles notifications; keep this to catch unexpected errors
  }
});

// === Collapsible Feature / Bug Request ===
const collapBtn = document.querySelector('.collapsible-btn');
const collapContent = document.querySelector('.collapsible-content');

if (collapBtn && collapContent) {
    collapBtn.addEventListener('click', () => {
        collapContent.style.display = collapContent.style.display === 'block' ? 'none' : 'block';
    });
}

const featureBtn = document.getElementById('featureRequestBtn');
if (featureBtn) {
    featureBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: "https://docs.google.com/forms/d/e/1FAIpQLSeR4HpD_-Bg5dmjOml70jW9sVLHK2BCerNlQK-RXs1wrUjySw/viewform?usp=dialog"
        });
    });
}

// === Initialize popup sign-in status ===
updateSignInStatus();
