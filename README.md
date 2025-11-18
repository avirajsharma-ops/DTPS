# Zoconut - Nutrition & Wellness Platform

A comprehensive nutrition and wellness platform built with Next.js 14, connecting certified dietitians with clients for personalized meal plans, health tracking, and expert guidance.

## 🌟 Features

### 🔐 Authentication & User Management
- Multi-role system (Dietitian, Client, Admin)
- Secure authentication with NextAuth.js
- Role-based access control
- Professional credential verification

### 👥 Client Management
- Comprehensive client onboarding
- Health questionnaires and medical history
- Document upload (medical reports, lab results)
- Progress tracking and monitoring

### 📅 Appointment Scheduling
- Flexible appointment booking system
- Calendar integration
- Automated reminders
- Video consultation support

### 🍽️ Meal Planning & Nutrition
- Custom meal plan creation
- Extensive recipe database
- Macro and calorie tracking
- Food logging and analysis

### 💬 Communication
- Real-time messaging between dietitians and clients
- Progress updates and notifications
- Group communication features

### 💳 Payment & Billing
- Integrated payment processing (Stripe/Razorpay)
- Subscription management
- Invoice generation
- Payment history tracking

### 📊 Analytics & Reporting
- Comprehensive dashboards for all user roles
- Progress tracking and visualization
- Revenue analytics for dietitians
- System analytics for admins

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/ui** component library
- **React Hook Form** for form handling
- **Recharts** for data visualization

### Backend
- **Next.js API Routes**
- **MongoDB** with Mongoose ODM
- **NextAuth.js** for authentication
- **Zod** for validation

### Authentication & Security
- JWT tokens
- Bcrypt password hashing
- Role-based middleware
- HIPAA compliance measures

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zoconut-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Update the following variables in `.env.local`:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/zoconut

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here

   # JWT
   JWT_SECRET=your-jwt-secret-here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
zoconut-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Role-specific dashboards
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── forms/             # Form components
│   │   ├── layout/            # Layout components
│   │   └── ui/                # UI components
│   ├── lib/                   # Utility libraries
│   │   ├── auth/              # Authentication utilities
│   │   ├── db/                # Database connection and models
│   │   ├── utils/             # General utilities
│   │   └── validations/       # Zod schemas
│   └── types/                 # TypeScript type definitions
├── middleware.ts              # Next.js middleware
└── package.json
```

## 🎯 User Roles & Permissions

### Client
- View personal dashboard
- Access meal plans
- Log food intake
- Track progress
- Book appointments
- Message dietitian

### Dietitian
- Manage clients
- Create meal plans
- Schedule appointments
- View client progress
- Generate reports
- Manage revenue

### Admin
- System overview
- User management
- Platform analytics
- Support management
- System settings

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Models

The application uses the following main models:
- **User** - Multi-role user management
- **Appointment** - Scheduling and consultation management
- **MealPlan** - Nutrition planning
- **Recipe** - Food database
- **Message** - Communication system
- **Payment** - Billing and transactions
- **ProgressEntry** - Health tracking
- **FoodLog** - Daily nutrition logging

## 🚀 Deployment

### Environment Setup
1. Set up MongoDB Atlas or your preferred MongoDB hosting
2. Configure environment variables for production
3. Set up payment gateway credentials (Stripe/Razorpay)
4. Configure email service for notifications

### Vercel Deployment
1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy with automatic CI/CD

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@zoconut.com or join our Slack channel.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Shadcn for the beautiful UI components
- MongoDB team for the robust database
- All contributors and testers
