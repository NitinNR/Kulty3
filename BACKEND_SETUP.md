# Backend Setup & Environment Configuration

## ✅ Fixes Applied

### 1. Fixed Environment Variable Loading Order
- **Issue**: Routes were imported before `dotenv.config()` was called
- **Fix**: Moved `dotenv.config()` to the very beginning of `server.js`
- **Why**: Environment variables must be loaded before any modules that use them

### 2. Fixed Firebase Admin Initialization
- **Issue**: Firebase initialization failed because environment variables were undefined
- **Fix**: Added validation checks and better error handling
- **Why**: Now it warns instead of crashing if credentials aren't set

### 3. Fixed Razorpay Initialization
- **Issue**: Razorpay tried to initialize at module load time without credentials
- **Fix**: Switched to lazy initialization (only when `/api/payments` is called)
- **Why**: Prevents the server from crashing if Razorpay keys aren't set

---

## 📝 Environment Setup

### Quick Start (Testing Without Real Credentials)

A test `.env` file has been created. You can start the server now:

```bash
cd "d:\My works\Kulty3\backend"
npm run dev
```

The server will start and warn you about missing credentials, but you can test other parts of the app.

---

## 🔐 Real Credentials Setup

To fully integrate Firebase and Razorpay, you need to add real credentials to `.env`:

### Step 1: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Copy the JSON file contents

Your `.env` should have:
```env
FIREBASE_PROJECT_ID=your-actual-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Important**: The private key must have newlines as `\n` (escaped), not actual newlines.

### Step 2: MongoDB Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Create a database user
4. Get the connection string

Your `.env` should have:
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/kulty
```

### Step 3: Razorpay Setup

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** → **API Keys**
3. Get your test mode keys

Your `.env` should have:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
```

---

## 🚀 Running the Backend

```bash
cd "d:\My works\Kulty3\backend"

# Install dependencies (if not done)
npm install

# Development mode
npm run dev

# Production mode
npm start
```

**Backend will run at**: http://localhost:5000

---

## ✅ Verify Backend is Working

Test the health endpoint:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{ "status": "OK" }
```

---

## 🔧 Troubleshooting

### "Firebase environment variables not set"
- Add real Firebase credentials to `.env`
- The server will still run, but auth will fail

### "Razorpay keys not configured"
- Add real Razorpay test keys to `.env`
- Payment endpoints will return error until configured

### MongoDB Connection Error
- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure database name is correct

### Port Already in Use
- Change `PORT=5000` to a different port in `.env`
- Or kill the process: `lsof -i :5000` / `kill -9 <PID>`

---

## 📚 API Endpoints

All endpoints are under `/api`:

- `POST /api/auth/complete-profile` - Complete user profile
- `GET /api/users/me` - Get current user
- `GET /api/venues` - List venues
- `POST /api/payments/create-order` - Create payment order (needs Razorpay)
- `POST /api/payments/verify` - Verify payment

---

## 🎯 Next Steps

1. **Option A: Test Now** (without real credentials)
   ```bash
   npm run dev
   ```
   Server starts but Firebase/Razorpay features won't work

2. **Option B: Setup Real Credentials**
   - Get Firebase, MongoDB, Razorpay credentials
   - Update `.env` file
   - Restart server: `npm run dev`

3. **Run Frontend**
   ```bash
   cd ../frontend
   npm run dev
   ```

---

**Backend is now ready to run!** 🚀
