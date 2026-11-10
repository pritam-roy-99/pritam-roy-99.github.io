# SNB Mess Omelet Service (GitHub Pages + Google Sheets)

**Website:** https://pritam-roy-99.github.io/omelet-service/

This project lives in its own folder inside the existing GitHub Pages repository, so the main academic website is not replaced.

## Features

- Date, Lunch/Dinner, mess serial number and quantity entry.
- Editable local order history and cancellation with audit trail.
- Local browser persistence via `localStorage`; data remains in this browser until cleared.
- Search and CSV export, daily kitchen summary, monthly serial-wise totals.
- Price per omelet stored separately for each month in this browser.
- Optional Google Sheet synchronization with per-order IDs and retry verification.

## Google Sheet connection (admin-managed)

1. Create a new spreadsheet using https://sheets.new; name it **SNB Mess Omelet Orders**.
2. Open **Extensions > Apps Script**.
3. Replace the default `Code.gs` with the full `Code.gs` file in this directory.
4. Click **Save**, choose `setup`, and click **Run**. Authorize access to this spreadsheet.
5. In Apps Script, open **Execution log** for that `setup()` run and copy the **PRIVATE SYNC KEY**. Do **not** publish this value in GitHub or screenshots.
6. In the Google Sheet, confirm the **Orders**, **Monthly Summary**, and **Settings** tabs. Set `Settings!B2` to the default rupees-per-omelet rate. Optional month-specific rates go in `Settings!A6:B` (for example `2026-11`, `15`).
7. In Apps Script: **Deploy > New deployment > Web app**, **Execute as: Me**, **Who has access: Anyone**. Copy the deployment's `/exec` URL. This public endpoint is protected by the shared key, not a member login. Use only with the mess administrator's approval.
8. Open the GitHub Pages website above. Select **Google Sheet Sync** and enter the `/exec` URL and PRIVATE SYNC KEY, then click **Sync pending edits and retrieve records**.
9. Check the Google Sheet **Orders** tab and monthly summary. After a successful sync, the app will mark matching orders **Synced**.

### Verification test

Add Lunch, serial 101, quantity 2 and Dinner, serial 101, quantity 1, both for the same date. Sync. Google Sheet should have two Active orders, and Monthly Summary should show **Lunch 2, Dinner 1, Total 3** for serial 101. If the unit price is 15, the amount is **₹45**. Edit the quantity locally, sync again, and verify the *same* order row is updated (not duplicated). Cancel an order, sync, and verify that it remains as Cancelled in the audit trail and is excluded from the bill.

## Important behavior and limitations

- **GitHub Pages cannot directly act as a secure database backend.** Google Apps Script must be deployed separately by the spreadsheet owner.
- Sync is administrator-controlled, not automatic background sync. In particular, local edits remain pending until **Sync** is clicked.
- Each browser's `localStorage` is private to that browser profile. Clearing browser storage deletes unsynced records. Export CSV regularly.
- The Google Sheet is the shared source of truth after synchronization.
- This implementation uses a shared secret stored **only on the admin device**, not in the public repository. The token is sent in a URL for read-back via JSONP, so it may appear in browser history or server logs. Do not use this approach for sensitive records or a public member portal.
- Anyone with the deployed Script URL **and the key** can read and change sheet order records. This is not secure per-member authentication. Keep the key restricted to trusted mess administrators; if it leaks, replace it in Apps Script Script Properties.
- Do not share Google Sheet editor rights with mess members.
- When two admins edit the same record offline, the last accepted update may win. Avoid concurrent edits until stronger conflict handling and accounts are implemented.
- Google Apps Script web app deployment may be restricted by the owner's Google Workspace organization.
- For a proper public/member-facing version, add authenticated access with role-based permissions and a protected backend.

This application is independent of Axiovo and has no access to its data.
