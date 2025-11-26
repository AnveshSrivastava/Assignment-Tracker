# SeaMist Assignment Tracker

A premium, calm, and distraction-free assignment tracker for students.  
**Tech Stack:** Vanilla HTML, CSS, JavaScript (No frameworks, No backend).  
**Persistence:** Browser LocalStorage.

## 🌊 Features
1.  **Subject Management:** Add subjects, edit names inline, and delete.
2.  **Assignment Cycle:** 5 Fixed cells per subject. Click to cycle status:
    * ⚪ Not Provided
    * 🕑 Pending
    * 🟢 Completed
    * 🔵 Checked
    * 🟡 Uploaded
3.  **Themes:** * **Deep Sea:** Green & Gold (Default)
    * **Horizon:** Blue & White
    * **Shoreline:** Beige & Brown
4.  **Data Safety:** Auto-save, Undo Delete (5s toast), JSON Export/Import.

## 🚀 How to Run
1.  Download the files (`index.html`, `styles.css`, `app.js`).
2.  Place them in the same folder.
3.  Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge).
4.  No server required!

## 🛠 Customization
To change theme colors manually, open `styles.css` and edit the `:root` variables under the specific data-theme attributes.

**Example (Deep Sea):**
```css
[data-theme="sea"] {
    --primary: #0F7A5F; /* Main Color */
    --accent: #D4AF37;  /* Gold Accent */
}