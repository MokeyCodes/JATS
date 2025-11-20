# Changelog

All notable changes to this project will be documented in this file.


## [1.1.0] - 2025-11-19

### Added
- Automatic Google Sheet template creation on first job log.
- Dual-row headers for columns (Title + Description) with navy blue top row and bold white text.
- Frozen header row for easier navigation.
- Default column widths and row heights set for improved readability.
- Colored login type cells for LinkedIn, Handshake, Jacobs Portal, Google Email, and Apple ID.
- Smaller font size for description row for better readability.

### Changed
- Removed “Copy Template” button as template is now auto-generated.
- Improved error handling when no sheet is found; auto-creates new template if needed.
- Improved UI/UX for logging jobs and sheet creation.
- **Uses only non-sensitive scopes (`drive.file`) — no invasive verification required.**

## [v1.0.1] - Released
### Added
- README improvements
    - Side by side screenshots of UI Improvements
    - Google Form Request for Features/Website Functionality/Bugs
- Dropdowns
    - Added a button to copy a Google Sheets Template
    - Donation Dropdown
    - Request New Website Support/Bug
- Updated job logging UI
  - Replaced `alert()` pop-ups with inline animation for job log confirmation

### Fixed
- Minor code improvements and bug fixes

## [v1.0.0] - Released
### Added
- Initial release of J.A.T.S. Chrome Extension
- Logs job applications from LinkedIn, Handshake, and UCSD Jacobs Portal
- Saves to personal Google Sheets
- Basic popup UI and icons
