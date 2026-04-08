# Dental Interactive Guide - Developer Documentation

## 1. Project Overview
The **Dental Interactive Guide** is a community-driven, mobile-first web application designed for dental professionals, students, and patients. It functions as a hybrid between a clinical discussion forum (with medical imagery, interactive landmarks, and diagnostic polls) and a modern social network (Instagram-style feed, Direct Messaging, Follow system).

### Tech Stack
*   **Frontend:** React (via Vite)
*   **Backend / Auth / DB:** Google Firebase (Authentication, Firestore Database)
*   **File Storage:** Custom PHP Backend Server (`upload.php`) to bypass free-tier Firebase limitations.
*   **Styling:** Pure CSS (`App.css`) using CSS Grid/Flexbox for responsive design.

---

## 2. Application Architecture & Routing

### Custom SPA Routing
Instead of using a bulky library like `react-router-dom`, the application uses a lightweight, custom state-based router tied to the browser's History API.
*   **State:** `const [currentPage, setCurrentPage] = useState(...)`
*   **Browser Sync:** `useEffect` hooks sync the `currentPage` state with `window.history.pushState` and `popstate` events.
*   **Why?** This keeps the bundle size incredibly small and allows for instantaneous page transitions without full browser reloads.

### The Hidden Admin Panel
*   **Route:** `/superaakash`
*   **Logic:** When the app detects this URL, it attempts to load the `admin-dashboard` view. It strictly checks if `userProfile.role === 'admin'`. If false or logged out, it acts as a secure login wall.
*   **Why?** Security through obscurity plus strict role-based access control (RBAC). 

---

## 3. Core Features Breakdown (What, Where, Why)

### A. Instagram-Style UI & Feed
*   **What:** A mobile-first, edge-to-edge scrolling feed replacing standard grids.
*   **Where:** `renderPage` -> `if (currentPage === 'home')`
*   **Why:** Modern users intuitively understand the "Instagram" layout. Bottom navigation (`🏠 🔍 ➕ 👤`) ensures thumb-reachability on mobile devices.
*   **Features Included:**
    *   **Double-Tap to Like:** Bound via `onDoubleClick` on images. Triggers a CSS animation (`.heart-overlay.animate`).
    *   **Infinite Scroll:** Uses `IntersectionObserver` attached to a hidden `div` at the bottom of the feed (`lastElementRef`). When visible, increments `visibleCount` by 12.
    *   **Pinch-to-Zoom:** Achieved entirely via CSS (`touch-action: pan-x pan-y pinch-zoom;`) to allow close inspection of X-Rays.

### B. Advanced Image Upload & Editing Pipeline
*   **What:** Multi-image uploads (Carousels), client-side compression, and a privacy/redaction editor.
*   **Where:** `renderUploadPage`, `handleAddProcedure`, and `handleSaveEditedImage`.
*   **Why:** High-res medical images consume too much space, and HIPAA compliance requires redaction tools.
*   **The Pipeline:**
    1.  **Select:** User selects files via `<input type="file" multiple />`.
    2.  **Edit (Filerobot):** User clicks "✏️ Edit". `react-filerobot-image-editor` opens to allow blurring and annotating.
    3.  **Compress:** Upon submission, `browser-image-compression` shrinks images to max `0.8MB` / `1920px`.
    4.  **Quota Check:** Checks total new file size against `userProfile.storageQuota`.
    5.  **Upload:** Sends files via `fetch()` to `https://dentistnearghaziabad.in/.../upload.php`.
    6.  **Save:** The returned URLs are saved to Firebase Firestore as an array (`imageUrls`).

### C. Direct Messaging (DMs) & Consultations
*   **What:** 1-on-1 private messaging with text, image attachment support, and "Share to DM" functionality.
*   **Where:** `renderInboxPage`, `renderChatPage`, `handleSendMessage`.
*   **Why:** Allows patients to consult specialists privately, or dentists to discuss cases.
*   **Implementation:**
    *   Chats are stored in a `chats` collection with a `participants` array. 
    *   Messages are stored in a `messages` sub-collection inside each chat document for scalability.
    *   **Blocking:** `userProfile.blockedUsers`. Silently disables the input box and stops notifications if User A blocks User B.

### D. Diagnostic Polls
*   **What:** Twitter-style multiple-choice polls attached to clinical cases.
*   **Where:** Built in `renderUploadPage` and rendered via the `renderPoll` helper function.
*   **Why:** Gamifies learning. Encourages users to commit to a differential diagnosis before reading comments.
*   **Implementation:** Stored as a nested `poll` object inside the procedure document. Tracks votes using a `votedUsers` map `{ userId: optionIndex }` to ensure users can only vote once.

### E. Interactive Anatomy Landmarks
*   **What:** Clickable "hotspots" overlaid on clinical images to map anatomy or pathology.
*   **Where:** `handleImageClick`, `saveLandmark`, and the `<div className="interactive-image-container">`.
*   **Why:** Turns static images into interactive learning tools. 
*   **Implementation:** Uses relative positioning (`left: x%`, `top: y%`) so pins scale perfectly regardless of screen size. 

### F. Content Moderation & Legal Protections
*   **What:** Reporting flags, admin wipe tools, and mandatory consent checkboxes.
*   **Where:** `handleReport`, `renderSupportPage`, Admin "Reports" Tab.
*   **Why:** Keeps the platform clean, professional, and legally compliant.
*   **Features:**
    *   **Patient Consent Checkbox:** Hard-blocks the "Share Post" button until checked.
    *   **Reporting:** Users flag content (`🚩`); sends a document to the `reports` collection. Admin views these in the dashboard and can one-click delete the offending document/comment.
    *   **Author Resolution:** Authors can click "✅ Mark as Resolved" to close a case once treated.

### G. Storage Quotas & Freemium Mechanics
*   **What:** Strict file storage limits per user with a request workflow.
*   **Where:** Upload logic & `renderProfilePage`.
*   **Why:** Prevents server abuse and manages hosting costs.
*   **Logic:**
    *   Default User = 25 MB (`25 * 1024 * 1024` bytes).
    *   Approved Dentist = 250 MB.
    *   Users can click "Request Quota Increase" in their profile, which flags `quotaRequested: true`. Admins approve this in the dashboard by typing a new MB limit.

### H. Plugins Architecture
*   **What:** A scalable system to inject code into the main app without cluttering `App.jsx`.
*   **Where:** `PluginRegistry.js` & `plugins/ExamplePlugin.jsx`.
*   **Why:** Safely allows building isolated features (like the SEO Optimizer) that hook into the routing and Admin Sidebar dynamically.

---

## 4. Firestore Database Schema

### `users` Collection
*   **Document ID:** Auth UID
*   **Fields:** `name`, `email`, `role` ("user", "dentist", "pending_dentist", "admin"), `bio`, `profilePic` (URL), `storageUsed` (bytes), `storageQuota` (bytes), `following` (Array of UIDs), `bookmarkedCases` (Array of Post IDs), `blockedUsers` (Array of UIDs).

### `procedures` Collection (Cases/Posts)
*   **Document ID:** Auto-generated
*   **Fields:** `title`, `shortDesc`, `content`, `category`, `imageUrl` (legacy), `imageUrls` (Array), `authorId`, `authorName`, `visibility`, `views` (Number), `likes` (Array of UIDs), `isResolved` (Boolean).
*   **Sub-collection `comments`:** `text`, `authorId`, `upvotes`, `isFinal` (Admin Verified).

### `chats` Collection
*   **Document ID:** Auto-generated
*   **Fields:** `participants` (Array of 2 UIDs), `participantNames` (Map), `lastMessage`, `lastUpdated`.
*   **Sub-collection `messages`:** `senderId`, `text`, `imageUrl` (optional), `caseId` (optional, for Share to DM).

### `landmarks` Collection
*   **Fields:** `imageId` (matches Procedure ID), `x` (%), `y` (%), `name`, `diseases`, `treatments`, `status` ("pending" or "approved").

### `reports` Collection
*   **Fields:** `type` ("procedure" or "comment"), `targetId`, `commentId`, `reason`, `reportedBy`.

---

## 5. Security Rules (Recommended Production Setup)
To ensure your platform remains secure when deployed, ensure your Firebase Firestore Rules eventually look something like this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone logged in can read public data
    match /{document=**} {
      allow read: if request.auth != null;
    }
    
    // Only admins can write blindly
    // Users can only write to their own DMs, profiles, or create procedures
    // (Requires detailed granular rules for production)
  }
}
```

## 6. PWA & Deployment Notes
*   **PWA (Progressive Web App):** The app includes a `manifest.json` and `sw.js` (Service Worker) in the `/public` directory.
*   **Installation:** When opened on a mobile browser, a "📲 Install" button appears in the top header. This installs the app to the phone's home screen without needing an App Store.
*   **Deployment:** When deploying to Firebase Hosting, Vercel, or Netlify, ensure you set the server rewrite rules to catch all routes and point them to `index.html` (Standard SPA configuration), otherwise custom routes like `/superaakash` will return a 404 error on a hard refresh.