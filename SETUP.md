# Kulty - Setup Guide

## Quick Start

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Google** and **Phone Authentication** in Authentication > Sign-in method
4. Create a service account:
   - Project Settings > Service Accounts
   - Generate new private key
   - Copy the JSON credentials

### 2. Razorpay Setup

1. Create account at [Razorpay](https://razorpay.com)
2. Get API keys from Settings > API Keys
3. Note: Test mode uses ₹999 for annual subscription

### 3. MongoDB Setup

1. Create cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Whitelist your IP
4. Get connection string

### 4. Environment Setup

**Backend (.env)**
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/kulty
PORT=5000

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_key
```

**Frontend (.env)**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
VITE_API_BASE_URL=http://localhost:5000/api
```

### 5. Install & Run

```bash
# Install root dependencies
npm install

# Install frontend
cd frontend
npm install

# Install backend
cd ../backend
npm install

# Go back to root
cd ..

# Run both servers
npm run dev
```

## Testing Flow

### 1. User Flow
- Navigate to http://localhost:5173
- Login with Google (use test account)
- Complete profile
- Go to payment
- Use Razorpay test card:
  - Card: 4111 1111 1111 1111
  - Expiry: Any future date
  - CVV: Any 3 digits
- View membership card
- Browse venues (currently empty - create via admin panel)
- View entry history

### 2. Admin Flow
- Create test user with `role: 'admin'` in MongoDB
- Login with that Firebase account
- Manage venues, events, users from admin panel

### 3. Venue Owner Flow
- Create test user with `role: 'venue_owner'` in MongoDB
- Create a venue linked to this user
- Login and access venue portal
- Use QR scanner (use member QR code)
- Manage bills

## MongoDB Test Data

```javascript
// Add admin user (run in MongoDB Compass)
db.users.insertOne({
  firebaseUid: "your-firebase-uid",
  email: "admin@kulty.com",
  name: "Admin User",
  role: "admin",
  subscription: { status: "active" }
})

// Add test venue
db.venues.insertOne({
  name: "The Golden Lounge",
  description: "Premium cocktail bar",
  category: "lounge",
  city: "Mumbai",
  cashbackPercentage: 5,
  status: "active"
})
```

## Common Issues

### 1. Firebase Auth Error
- Ensure Firebase project domain matches
- Check CORS settings in backend
- Verify ID token in browser console

### 2. MongoDB Connection Error
- Check IP whitelist in MongoDB Atlas
- Verify connection string
- Ensure database exists

### 3. Razorpay Payment Error
- Use test mode keys
- Use test card numbers
- Check webhook endpoint (if testing webhooks)

### 4. CORS Issues
- Backend CORS should allow `http://localhost:5173`
- Frontend API URL should point to `http://localhost:5000/api`

## Port Configuration

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000
- **MongoDB**: Default (ensure access)

## Next Steps

1. **Deploy Frontend**: 
   - Build: `npm run build` in frontend
   - Deploy to Vercel/Netlify
   - Update `VITE_API_BASE_URL` to production backend

2. **Deploy Backend**:
   - Deploy to Heroku/Railway/Render
   - Set environment variables on platform
   - Update frontend API URL

3. **Customize**:
   - Update branding (logo, colors)
   - Configure subscription pricing
   - Set up email notifications
   - Add venue images and details

## Support

Refer to README.md for full documentation and API routes.
