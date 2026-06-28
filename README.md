# Kulty - Premium Membership Club Platform

A full-stack web application for managing premium membership clubs with QR-based venue check-ins, bill uploads, and cashback rewards.

## Features

### User Features
- **Google & Phone OTP Authentication** - Secure login with Firebase
- **Digital Membership Card** - Beautiful QR code membership card
- **Venue Discovery** - Browse and filter venues by category
- **Venue Check-ins** - Via QR code scan at venues
- **Bill Upload & Cashback** - Upload bills for cashback approval
- **Entry History** - Track all check-ins and bill status
- **Annual Subscription** - Razorpay payment integration

### Venue Owner Features
- **QR Scanner** - Scan member QR codes for check-ins
- **Entry Management** - View all member check-ins
- **Bill Verification** - Approve/reject member bills
- **Venue Management** - Edit venue details and images

### Admin Features
- **Dashboard** - Overview of users, venues, entries, and bills
- **User Management** - Manage all users and subscriptions
- **Venue Management** - Add/edit/delete venues
- **Event Management** - Create and manage events
- **Entry Logs** - Track all venue check-ins
- **Bill Approval** - View and process bills

## Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Firebase** - Authentication
- **Razorpay** - Payment processing
- **Axios** - HTTP client
- **QRCode.React** - QR code generation
- **html5-qrcode** - QR code scanner
- **react-hot-toast** - Notifications

### Backend
- **Node.js + Express** - Server
- **MongoDB + Mongoose** - Database
- **Firebase Admin SDK** - Server-side auth
- **Razorpay SDK** - Payment processing
- **CORS** - Cross-origin support

## Project Structure

```
kulty3/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API & Firebase services
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom hooks
│   │   ├── routes/             # Route protection
│   │   ├── App.jsx             # Main router
│   │   └── index.css           # Global styles
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                    # Express application
│   ├── src/
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # API routes
│   │   ├── middleware/         # Auth & validation
│   │   ├── services/           # Firebase & Razorpay
│   │   ├── config/             # Database config
│   │   └── server.js           # Entry point
│   └── package.json
│
└── package.json                # Root scripts
```

## Getting Started

### Prerequisites
- Node.js v20.11.1 or higher
- MongoDB URI
- Firebase project with credentials
- Razorpay API keys

### Installation

1. **Clone or extract the project**
   ```bash
   cd kulty3
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   cd ..
   ```

3. **Setup environment variables**

   Create `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kulty
   PORT=5000
   
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   
   RAZORPAY_KEY_ID=your-razorpay-key
   RAZORPAY_KEY_SECRET=your-razorpay-secret
   ```

   Create `frontend/.env`:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_RAZORPAY_KEY_ID=your-razorpay-key
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

### Running Development

Run both frontend and backend concurrently:
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## API Routes

### Authentication
- `POST /api/auth/complete-profile` - Complete user profile

### Users
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update user profile
- `GET /api/users` - Get all users (admin only)

### Venues
- `GET /api/venues` - List venues (search, filter by category)
- `GET /api/venues/:id` - Get venue details
- `POST /api/venues` - Create venue (admin only)
- `PUT /api/venues/:id` - Update venue
- `DELETE /api/venues/:id` - Delete venue (admin only)

### Events
- `GET /api/events` - List events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (admin only)
- `PUT /api/events/:id` - Update event (admin only)
- `DELETE /api/events/:id` - Delete event (admin only)

### Entries & Bills
- `POST /api/entries/scan` - Scan member QR (venue owner only)
- `GET /api/entries/my` - Get user's entries
- `GET /api/entries/venue/:id` - Get venue entries (venue owner only)
- `POST /api/entries/:id/bills` - Upload bill
- `PATCH /api/entries/:entryId/bills/:billId` - Approve/reject bill (venue owner only)

### Payments
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET /api/admin/users` - All users
- `GET /api/admin/entries` - All entries
- `GET /api/admin/bills` - All bills

## User Flows

### User Registration & Membership
1. Login with Google or Phone OTP
2. Complete profile (name, photo, DOB)
3. Select subscription plan
4. Pay via Razorpay
5. Receive digital membership card with QR code
6. Access venue discovery

### Venue Check-in
1. Visit venue
2. Venue owner scans member QR code
3. Check-in logged in all portals
4. Member can upload bills from this entry

### Bill Cashback
1. Member uploads bill (image + amount)
2. Venue owner reviews and approves/rejects
3. Approved bills visible to admin
4. Admin manually processes cashback

## UI/UX Design

- **Color Scheme**: Deep navy/charcoal + gold accents (premium feel)
- **Responsive**: Mobile-first design with bottom navigation
- **Desktop**: Sidebar navigation for admin/venue portals
- **Components**: Reusable, accessible, consistent styling
- **Animations**: Smooth transitions and loading states

## Security

- Firebase authentication (server-side ID token verification)
- Role-based access control (user, venue_owner, admin)
- Razorpay signature verification for payments
- CORS enabled for frontend domain
- Environment variables for sensitive data

## Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Backend (Heroku/Railway/Render)
```bash
cd backend
npm start
```

## Future Enhancements

- Wallet integration
- Real-time notifications
- Mobile app (React Native)
- Analytics dashboard
- Referral program
- Multiple subscription tiers

## Support

For issues or questions, please contact the development team.

## License

ISC
