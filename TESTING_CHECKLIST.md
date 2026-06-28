# Kulty - Testing Checklist

## Pre-Testing Setup

- [ ] MongoDB Atlas cluster created
- [ ] Firebase project created with credentials
- [ ] Razorpay account created with test keys
- [ ] `.env` files created with all credentials
- [ ] All dependencies installed (`npm install` in all folders)
- [ ] Both servers running (`npm run dev`)

## Frontend Testing

### Authentication & Onboarding
- [ ] Can sign in with Google
- [ ] Can send OTP via phone
- [ ] Can verify OTP and login
- [ ] CompleteProfilePage loads after first login
- [ ] Can upload profile photo
- [ ] Redirects to payment after profile completion

### Payment Flow
- [ ] PaymentPage displays correctly
- [ ] Plan details shown with ₹999 price
- [ ] Razorpay checkout opens
- [ ] Can use test card: 4111111111111111
- [ ] Payment verifies successfully
- [ ] Redirects to success page
- [ ] Redirects to /card page automatically

### Membership Card
- [ ] CardPage loads
- [ ] Card displays member name
- [ ] Card displays membership ID
- [ ] QR code visible and scannable
- [ ] Card shows validity date
- [ ] Download button works
- [ ] Benefits section displays

### Venue Discovery
- [ ] HomePage loads after payment
- [ ] Can see venue grid
- [ ] Search bar works
- [ ] Category filters work (if venues exist)
- [ ] Venue cards show images, name, category
- [ ] Cashback % displays correctly
- [ ] Events section shows (if events exist)

### Entry History
- [ ] EntryHistoryPage loads
- [ ] Shows empty state if no entries
- [ ] Bill upload modal opens
- [ ] Can select image file
- [ ] Can enter amount
- [ ] Can upload bill
- [ ] Bill status updates after upload

### Profile
- [ ] ProfilePage displays user info
- [ ] Name, email, phone shown
- [ ] Subscription status shows
- [ ] Member since date displays
- [ ] Benefits list visible

### Navigation
- [ ] Bottom navigation visible on mobile
- [ ] All nav items clickable
- [ ] Active state highlighted
- [ ] Navbar logout works
- [ ] Logout redirects to login

## Backend Testing

### API Health
- [ ] `GET /health` returns 200
- [ ] CORS headers present
- [ ] Error handling works

### Authentication
- [ ] Invalid token rejected
- [ ] Valid Firebase token accepted
- [ ] User created on first auth
- [ ] Profile completion saves to DB

### Venues API
- [ ] `GET /venues` returns list
- [ ] Search filter works
- [ ] Category filter works
- [ ] Pagination works
- [ ] `GET /venues/:id` returns venue
- [ ] Create venue requires admin role
- [ ] Edit venue works
- [ ] Delete venue requires admin role

### Events API
- [ ] `GET /events` returns list
- [ ] `GET /events/:id` returns event
- [ ] Create event requires admin role
- [ ] Update event requires admin role
- [ ] Delete event requires admin role

### Entries API
- [ ] `POST /entries/scan` creates entry
- [ ] Scan requires venue_owner role
- [ ] Returns member info on scan
- [ ] `GET /entries/my` returns user's entries
- [ ] `GET /entries/venue/:id` returns venue's entries
- [ ] Venue owner can only see their venue's entries
- [ ] `POST /entries/:id/bills` uploads bill
- [ ] `PATCH /entries/:id/bills/:billId` approves bill

### Users API
- [ ] `GET /users/me` returns current user
- [ ] `PATCH /users/me` updates user
- [ ] `GET /users` requires admin role
- [ ] Admin can list all users
- [ ] Pagination works

### Payments API
- [ ] `POST /create-order` returns order ID
- [ ] Order amount is correct (₹999 = 99900)
- [ ] `POST /verify` checks signature
- [ ] Invalid signature rejected
- [ ] Valid payment activates subscription
- [ ] Membership ID generated
- [ ] End date set to 1 year later

### Admin API
- [ ] `GET /stats` returns dashboard numbers
- [ ] Stats include: users, subscriptions, venues, entries
- [ ] `GET /users` lists all users
- [ ] `GET /entries` lists all entries
- [ ] `GET /bills` lists all bills

## Integration Testing

### User Flow (Complete)
- [ ] Login → Profile → Payment → Card → Home → Entries
- [ ] Can navigate between all pages
- [ ] Data persists across page refreshes
- [ ] Logout works and redirects to login

### Error Handling
- [ ] Invalid credentials show error message
- [ ] Network errors handled gracefully
- [ ] Payment errors show toast notification
- [ ] API errors show user-friendly messages

### Responsive Design
- [ ] Mobile (375px): Layout works, no overflow
- [ ] Tablet (768px): Grid shows 2 columns
- [ ] Desktop (1920px): Grid shows 3 columns
- [ ] Touch targets are 48px minimum
- [ ] No horizontal scroll on mobile

## Performance Testing

- [ ] Page load time < 3 seconds
- [ ] API responses < 500ms
- [ ] No console errors
- [ ] No memory leaks (DevTools)
- [ ] Images load correctly
- [ ] Cards render smoothly

## Security Testing

- [ ] Can't access /home without payment
- [ ] Can't access admin routes without admin role
- [ ] Can't access venue owner routes without role
- [ ] CSRF protected (token in headers)
- [ ] Sensitive data not in localStorage
- [ ] Firebase token refreshes automatically

## Browser Compatibility

- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Edge latest
- [ ] Mobile Chrome (iOS/Android)
- [ ] Mobile Safari (iOS)

## Database Testing

- [ ] User created on first login
- [ ] Profile saved correctly
- [ ] Subscription updated after payment
- [ ] Membership ID is unique
- [ ] Entry logged on scan
- [ ] Bill saved with entry

## Edge Cases

- [ ] What if user logs in again? (existing user flow)
- [ ] What if payment fails? (retry works)
- [ ] What if user refreshes during payment? (shows success)
- [ ] What if QR scan fails? (error message shows)
- [ ] What if bill upload fails? (retry option shown)
- [ ] What if user changes role? (permissions update)
- [ ] What if subscription expires? (redirect to payment)

## Load Testing

- [ ] Can handle 10+ concurrent users
- [ ] Database queries are optimized (indexes)
- [ ] No timeout errors under load
- [ ] API response time consistent

## Final Checklist

- [ ] All user flows working
- [ ] All errors handled gracefully
- [ ] Responsive on all devices
- [ ] Performance acceptable
- [ ] Security measures in place
- [ ] Documentation complete
- [ ] Code is clean and commented
- [ ] No console errors/warnings
- [ ] Ready for deployment

## Notes

- Use test Firebase project credentials
- Use test Razorpay keys (test mode)
- Use test MongoDB cluster
- Check browser console for errors
- Check network tab for failed requests
- Monitor database for unexpected data
- Test on real devices if possible

## Deployment Readiness

- [ ] All tests passed
- [ ] Production .env ready
- [ ] Database backups configured
- [ ] Error logging set up
- [ ] Analytics configured
- [ ] Security audit done
- [ ] Performance optimized
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Go/No-Go decision made
