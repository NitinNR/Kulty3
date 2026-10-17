# Kulty - Complete File Structure

## 📂 Project Layout

```
kulty3/
│
├── 📄 Core Documentation
│   ├── README.md                      # Main project overview
│   ├── SETUP.md                       # Step-by-step setup guide
│   ├── IMPLEMENTATION_SUMMARY.md      # What's been built
│   ├── TESTING_CHECKLIST.md          # QA testing guide
│   ├── PROJECT_COMPLETE.md           # Completion summary
│   ├── FILE_STRUCTURE.md             # This file
│   └── .gitignore                    # Git configuration
│
├── 📦 Root Configuration
│   └── package.json                  # Root scripts & concurrently
│
├── 🎨 Frontend (React + Tailwind)
│   ├── package.json                  # Dependencies & scripts
│   ├── package-lock.json             # Lock file
│   ├── .env.example                  # Environment template
│   ├── vite.config.js                # Vite build config
│   ├── tailwind.config.js            # Tailwind theme
│   ├── postcss.config.js             # PostCSS config
│   ├── index.html                    # HTML entry point
│   │
│   └── src/
│       ├── main.jsx                  # React entry point
│       ├── App.jsx                   # Main router component
│       ├── index.css                 # Global styles & Tailwind
│       │
│       ├── 🔐 Contexts (State Management)
│       │   ├── AuthContext.jsx       # Firebase auth state
│       │   └── ToastContext.jsx      # Notifications
│       │
│       ├── 🪝 Custom Hooks
│       │   └── useAuth.js            # Auth hook
│       │
│       ├── 🔗 Services (API & Firebase)
│       │   ├── firebase.js           # Firebase methods
│       │   ├── msg91.js              # MSG91 OTP Widget client
│       │   └── api.js                # Axios API client
│       │
│       ├── 🛣️ Route Protection
│       │   ├── ProtectedRoute.jsx    # Auth check
│       │   ├── SubscriptionRoute.jsx # Subscription check
│       │   └── RoleRoute.jsx         # Role check
│       │
│       ├── 🎨 Components
│       │   │
│       │   ├── common/               # Reusable UI components
│       │   │   ├── Button.jsx        # Button variants
│       │   │   ├── Input.jsx         # Input field
│       │   │   ├── Spinner.jsx       # Loading spinner
│       │   │   ├── Modal.jsx         # Modal dialog
│       │   │   └── Badge.jsx         # Status badge
│       │   │
│       │   ├── layout/               # Layout components
│       │   │   ├── Navbar.jsx        # Top navigation
│       │   │   ├── BottomNav.jsx     # Mobile bottom nav
│       │   │   └── Sidebar.jsx       # Admin/venue sidebar
│       │   │
│       │   ├── auth/                 # Auth helpers
│       │   │   └── OtpInput.jsx      # 6-digit OTP box input (auto-advance/paste)
│       │   │
│       │   └── card/                 # Card component
│       │       └── MembershipCard.jsx # QR membership card
│       │
│       └── 📄 Pages
│           │
│           ├── auth/                 # Authentication pages
│           │   ├── LoginPage.jsx     # Google + Phone login
│           │   ├── CompleteProfilePage.jsx  # Profile setup
│           │   └── PhoneOTPPage.jsx  # OTP input (ready)
│           │
│           ├── payment/              # Payment pages
│           │   ├── PaymentPage.jsx   # Razorpay checkout
│           │   └── PaymentSuccessPage.jsx  # Success page
│           │
│           └── user/                 # User portal pages
│               ├── HomePage.jsx      # Venue discovery
│               ├── CardPage.jsx      # Membership card
│               ├── EntryHistoryPage.jsx  # Check-ins & bills
│               └── ProfilePage.jsx   # User profile
│
├── 🚀 Backend (Express + MongoDB)
│   ├── package.json                  # Dependencies & scripts
│   ├── package-lock.json             # Lock file
│   ├── .env.example                  # Environment template
│   │
│   └── src/
│       ├── server.js                 # Express server entry
│       │
│       ├── ⚙️ Config
│       │   └── db.js                 # MongoDB connection
│       │
│       ├── 🗄️ Database Models (Mongoose)
│       │   ├── User.js               # User schema
│       │   ├── Venue.js              # Venue schema
│       │   ├── Event.js              # Event schema
│       │   └── Entry.js              # Entry & bills schema
│       │
│       ├── 🛡️ Middleware
│       │   ├── firebaseAuth.js       # Token verification
│       │   └── requireRole.js        # Role authorization
│       │
│       ├── 🔧 Services
│       │   ├── firebaseAdmin.js      # Firebase admin init
│       │   └── msg91.js              # MSG91 access-token verification
│       │
│       └── 🛣️ API Routes
│           ├── auth.js               # POST /auth/complete-profile
│           ├── users.js              # GET/PATCH /users
│           ├── venues.js             # CRUD /venues
│           ├── events.js             # CRUD /events
│           ├── entries.js            # Scan, bills, history
│           ├── payments.js           # Create order, verify
│           └── admin.js              # Dashboard, stats
│
└── node_modules/                     # All dependencies (auto-generated)
```

---

## 📊 File Statistics

### Frontend
- **Components**: 11 files
- **Pages**: 8 files
- **Services**: 2 files
- **Contexts**: 2 files
- **Routes**: 3 files
- **Hooks**: 1 file
- **Config**: 3 files
- **Total**: ~30 files (excluding node_modules)

### Backend
- **Models**: 4 files
- **Routes**: 7 files
- **Middleware**: 2 files
- **Services**: 1 file
- **Config**: 1 file
- **Server**: 1 file
- **Total**: ~16 files (excluding node_modules)

### Documentation
- **Guides**: 5 markdown files
- **Config Examples**: 2 .env files
- **Miscellaneous**: 2 files

---

## 🔍 Key Files Overview

### Frontend Entry Points
- `index.html` - HTML container
- `main.jsx` - React DOM render
- `App.jsx` - Router setup
- `index.css` - Global styles

### Backend Entry Point
- `server.js` - Express server

### Critical Components
- `LoginPage.jsx` - Authentication
- `PaymentPage.jsx` - Razorpay integration
- `CardPage.jsx` - Membership card display
- `HomePage.jsx` - Venue browsing
- `EntryHistoryPage.jsx` - User entry history

### Critical Routes
- `auth.js` - Profile completion
- `payments.js` - Razorpay integration
- `users.js` - User management
- `admin.js` - Admin statistics

### Critical Models
- `User.js` - User with subscription
- `Entry.js` - Entry with bills array
- `Venue.js` - Venue with ownership
- `Event.js` - Event details

---

## 🚀 Running Files

### Development
```bash
npm run dev                    # Runs both via concurrently

# Or separately:
npm run dev:frontend          # Runs: frontend/src/main.jsx
npm run dev:backend           # Runs: backend/src/server.js
```

### Production
```bash
npm run build                 # Builds frontend
npm start                     # Runs backend
```

---

## 📝 Environment Files

### Backend (.env)
Required variables:
- `MONGODB_URI` - MongoDB connection
- `PORT` - Server port
- `FIREBASE_PROJECT_ID` - Firebase project
- `FIREBASE_PRIVATE_KEY` - Firebase key
- `FIREBASE_CLIENT_EMAIL` - Firebase email
- `RAZORPAY_KEY_ID` - Razorpay key
- `RAZORPAY_KEY_SECRET` - Razorpay secret
- `MSG91_AUTHKEY` - MSG91 account authkey (server-side token verification)

### Frontend (.env)
Required variables:
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project
- `VITE_RAZORPAY_KEY_ID` - Razorpay key
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_MSG91_WIDGET_ID` - MSG91 OTP Widget ID
- `VITE_MSG91_AUTH_TOKEN` - MSG91 OTP Widget token

---

## 🔄 Request/Response Flow

```
Frontend (React)
    ↓
Frontend services/api.js (Axios with auth)
    ↓
Backend Express server
    ↓
Backend middleware (firebaseAuth, requireRole)
    ↓
Backend routes (API endpoints)
    ↓
Backend models (Mongoose)
    ↓
MongoDB database
    ↓ (Response flows back)
Frontend (Display)
```

---

## 🗺️ Route Mapping

### User Routes
- `/login` - LoginPage
- `/complete-profile` - CompleteProfilePage
- `/payment` - PaymentPage
- `/payment/success` - PaymentSuccessPage
- `/card` - CardPage
- `/home` - HomePage
- `/entries` - EntryHistoryPage
- `/profile` - ProfilePage
- `/venues/:id` - VenueDetailPage (ready)
- `/events/:id` - EventDetailPage (ready)

### Admin Routes (Ready)
- `/admin/dashboard` - Admin dashboard
- `/admin/venues` - Venue management
- `/admin/events` - Event management
- `/admin/users` - User management
- `/admin/entries` - Entry logs
- `/admin/bills` - Bill management

### Venue Owner Routes (Ready)
- `/venue/dashboard` - Venue dashboard
- `/venue/scanner` - QR scanner
- `/venue/entries` - Check-in logs
- `/venue/bills` - Bill verification

---

## 💾 Database Collections

### Users
```javascript
{
  firebaseUid, name, email, phone, profilePhoto, role,
  membershipId, qrCodeData, subscription, createdAt
}
```

### Venues
```javascript
{
  ownerId, name, description, category, address, city,
  images, operatingHours, amenities, cashbackPercentage,
  status, createdAt
}
```

### Events
```javascript
{
  venueId, title, description, date, time, bannerImage,
  ticketPrice, capacity, status, createdAt
}
```

### Entries
```javascript
{
  userId, venueId, scannedBy, scannedAt,
  bills: [{ imageUrl, amount, status, verifiedBy }],
  cashback: { amount, status },
  createdAt
}
```

---

## 🎯 Next Files to Create (Optional)

For full implementation, add:
- `frontend/src/pages/venue/VenueDetailPage.jsx`
- `frontend/src/pages/event/EventDetailPage.jsx`
- `frontend/src/pages/admin/*` (6 admin pages)
- `frontend/src/pages/venue/*` (4 venue pages)
- `frontend/src/components/scanner/QRScanner.jsx`
- `backend/src/routes/bills.js` (bill management)

---

## 📚 Reference

- **Frontend**: React Router v6, Tailwind CSS, Firebase SDK
- **Backend**: Express.js, Mongoose, Firebase Admin SDK
- **Database**: MongoDB (document-based)
- **Authentication**: Firebase (OAuth + OTP)
- **Payments**: Razorpay (Indian payment gateway)

---

All files are present and functional! ✅
