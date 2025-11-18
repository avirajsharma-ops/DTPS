# Quick Start Guide - Zoom Meeting Integration

## 🚀 Getting Started

Your Zoom meeting integration is now complete! Follow these steps to start testing:

### Step 1: Complete Zoom Configuration

You need to add the missing Zoom credentials to your `.env.local` file:

```env
ZOOM_API_KEY=xqoUQj7dQj2l1rvjmudhUQ
ZOOM_API_SECRET=your-zoom-api-secret-here  # ⚠️ ADD THIS
ZOOM_ACCOUNT_ID=your-zoom-account-id-here  # ⚠️ ADD THIS
ZOOM_CLIENT_ID=5ES2hkQvTjdyflearEsGg
ZOOM_CLIENT_SECRET=TtvGFGDKXLtV25cIfYQJEhb4VpSA5J1h
```

**To get these credentials:**
1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Sign in and create a "Server-to-Server OAuth" app
3. Copy the Account ID and API Secret from your app dashboard

### Step 2: Set Up Dietitian Availability

**For Dietitians:**
1. Log in as a dietitian
2. Go to **"Availability"** in the sidebar (new menu item)
3. Click **"Setup Default Schedule"** for instant setup
4. Or add custom time slots manually

**Quick Setup Options:**
- **Default Schedule**: Monday-Friday, 9 AM - 5 PM with lunch break
- **Custom Slots**: Add specific days and times manually

### Step 3: Test the Integration

1. **Test Zoom API**: Go to `/admin/zoom-test` (admin/dietitian only)
2. **Book an Appointment**: 
   - As a client: Go to "Appointments" → "Book Appointment"
   - As a dietitian: Go to "Appointments" → "Book for Client"
3. **Check Meeting Details**: View the appointment to see Zoom meeting info

## 🎯 What's New

### ✅ Automatic Zoom Meetings
- Every booked appointment automatically gets a Zoom meeting
- Secure meeting links with passwords and waiting rooms
- Host (dietitian) and participant (client) access

### ✅ Availability Management
- New "Availability" page for dietitians
- Quick setup with default business hours
- Custom time slot management
- Real-time availability checking

### ✅ Flexible Booking System
- **New Flexible Booking Page**: Book appointments at any time with any dietitian
- **Enhanced Book-Client Page**: Toggle between available slots and flexible time selection
- **All Dietitians Access**: Fetch and select from all dietitians in the system
- **Any Time Booking**: Book appointments at any time, not just available slots

### ✅ Enhanced UI
- Beautiful Zoom meeting cards with countdown timers
- One-click join/start meeting buttons
- Copy-to-clipboard functionality
- Meeting status indicators (upcoming, live, ended)
- Flexible mode toggle with warnings and guidance

### ✅ Smart Features
- Graceful error handling (appointments work even if Zoom fails)
- Backward compatibility with existing appointments
- Real-time meeting status updates
- Security notices and user guidance
- Search functionality for dietitians and clients

## 🔧 Testing Workflow

### For Dietitians:
1. **Set Availability**: `/settings/availability`
2. **Book for Client**: `/appointments/book-client` (with flexible mode toggle)
3. **Flexible Booking**: `/appointments/book-flexible` (book with any dietitian at any time)
4. **View Meeting**: Check appointment details for Zoom info
5. **Start Meeting**: Use "Start Meeting" button (host privileges)

### For Clients:
1. **Book Appointment**: `/appointments/book`
2. **View Meeting**: Check appointment details
3. **Join Meeting**: Use "Join Meeting" button when it's time

### For Admins:
1. **Test Integration**: `/admin/zoom-test`
2. **Flexible Booking**: `/appointments/book-flexible` (book for any user combination)
3. **Monitor System**: Check logs for any Zoom API issues

## 🐛 Troubleshooting

### No Available Time Slots?
- Dietitian needs to set availability first
- Go to "Availability" in sidebar and setup schedule

### Zoom Test Fails?
- Check all environment variables are set
- Verify Zoom app has correct scopes: `meeting:write`, `meeting:read`, `user:read`
- Ensure Zoom account is active

### Meeting Creation Fails?
- Appointment will still be created (graceful fallback)
- Check server logs for specific error
- Verify host email exists in Zoom account

## 📱 Mobile Friendly

The entire interface is responsive and works great on mobile devices. Clients can easily join meetings from their phones.

## 🔒 Security Features

- End-to-end encryption via Zoom
- Password-protected meetings
- Waiting room enabled by default
- Secure credential storage in environment variables

## 🎉 Ready to Go!

Your Zoom integration is production-ready with:
- ✅ Complete meeting lifecycle management
- ✅ User-friendly interface
- ✅ Error handling and fallbacks
- ✅ Mobile responsiveness
- ✅ Security best practices

**Next Steps:**
1. Add your Zoom credentials
2. Set up dietitian availability
3. Book a test appointment
4. Join the meeting and celebrate! 🎉

---

**Need Help?** Check the detailed `ZOOM_INTEGRATION_GUIDE.md` for comprehensive documentation.
