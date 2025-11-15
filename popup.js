// === DOM references ===
const logButton = document.getElementById("logJob");
const loginSelect = document.getElementById("loginSelect");
const sheetUrlInput = document.getElementById("sheetInput");
const saveCheckbox = document.getElementById("saveLinkCheckbox");
const signInStatus = document.getElementById("signInStatus");
const signInBtn = document.getElementById("signInBtn");

// === OAuth scope ===
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

// === Extract Sheet ID from URL ===
function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
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

// === Append row & color Login Type cell ===
async function appendRow(sheetId, row) {
  try {
    let token = await getToken(false).catch(() => null);
    if (!token) token = await getToken(true);

    // --- Step 1: Get first sheet name and sheetId ---
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const metaData = await metaRes.json();
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
    const updatedRange = appendData.updates.updatedRange; // e.g., "Sheet1!A3:F3"
    const match = updatedRange.match(/!(?:[A-Z]+)(\d+):/);
    const rowIndex = match ? parseInt(match[1], 10) - 1 : null; // zero-indexed
    if (rowIndex === null) return appendData;

    // --- Step 4: Determine colors ---
const loginColors = {
  "LinkedIn": { red: 0.79, green: 0.85, blue: 0.97 }, // #c9daf8
  "Handshake": { red: 0.83, green: 0.98, blue: 0.33 }, // #d3fb53
  "Apple ID": { red: 0.60, green: 0.60, blue: 0.60 },  // #999999
  "Google Email": { red: 0.26, green: 0.52, blue: 0.96 }, // #4285F4
  "Jacobs Portal": { red: 0.85, green: 0.69, blue: 0.85 } // #DAB1DA
};

const requests = [];

// --- Reset company cell style first ---
requests.push({
  repeatCell: {
    range: {
      sheetId: sheetIdNum,
      startRowIndex: rowIndex,
      endRowIndex: rowIndex + 1,
      startColumnIndex: 2,
      endColumnIndex: 3
    },
    cell: { userEnteredFormat: { textFormat: { bold: false, foregroundColor: { red: 0, green: 0, blue: 0 } } } },
    fields: "userEnteredFormat.textFormat"
  }
});

// --- Apply red + bold only if no company found ---
if (row[2] === "No Company Found") {
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetIdNum,
        startRowIndex: rowIndex,
        endRowIndex: rowIndex + 1,
        startColumnIndex: 2,
        endColumnIndex: 3
      },
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
      range: {
        sheetId: sheetIdNum,
        startRowIndex: rowIndex,
        endRowIndex: rowIndex + 1,
        startColumnIndex: 5,
        endColumnIndex: 6
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: loginFormat,
          horizontalAlignment: "CENTER",
          textFormat: { bold: true }
        }
      },
      fields: "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)"
    }
  });
}


// --- Step 5: Send batchUpdate if needed ---
if (requests.length > 0) {
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ requests })
  });
}


    alert("✅ Job logged successfully!");
    return appendData;
  } catch (err) {
    console.error(err);
    alert("❌ Failed to log job: " + err.message);
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
          const h1 = document.querySelector("h1");
          if (h1) {
            const companyDiv = h1.closest("div")?.querySelector("a > div.sc-gtMvKj.fXpKiB");
            if (companyDiv) company = companyDiv.innerText.trim();
          }
          if (company === "No Company Found") {
            const h3 = document.querySelector("h3");
            if (h3) company = h3.innerText.trim();
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

// === Save/restore Google Sheet URL ===
chrome.storage.local.get(["savedSheetLink"], (result) => {
  if (result.savedSheetLink) {
    sheetUrlInput.value = result.savedSheetLink;
    saveCheckbox.checked = true;
  }
});

saveCheckbox.addEventListener("change", () => {
  if (saveCheckbox.checked) chrome.storage.local.set({ savedSheetLink: sheetUrlInput.value.trim() });
  else chrome.storage.local.remove("savedSheetLink");
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
    alert("Sign in failed: " + err.message);
  }
});

// === Log Job button ===
logButton.addEventListener("click", async () => {
  const sheetId = extractSheetId(sheetUrlInput.value.trim());
  if (!sheetId) return alert("⚠️ Invalid Google Sheet URL.");

  try {
    const token = await updateSignInStatus();
    if (!token) return alert("Please sign in with Google first.");

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
      jobInfo.loginInfo
    ];

    await appendRow(sheetId, newRow);
  } catch (err) {
    console.error(err);
    alert("❌ Error logging job: " + err.message);
  }
});

// === Initialize popup ===
updateSignInStatus();
