# PAMET Voting System

A modern, real-time voting system built with Next.js, React, TypeScript, and Supabase. This application allows users to create polls, vote on them, and view real-time results.

## 🚀 Features

- **User Authentication**: Secure sign-in with Google via Supabase Auth
- **Poll Creation**: Create polls with multiple options and optional expiry dates
- **Real-time Voting**: Vote on active polls with instant result updates
- **Vote Visualization**: Beautiful progress bars showing vote percentages
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Security**: One vote per user per poll with Row Level Security (RLS)
- **Modern UI**: Clean, professional interface using Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## 📋 Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier available)
- Git installed

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd pamet-voting-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Create a new project (free tier available)

2. **Set Up the Database**:
   - In your Supabase dashboard, go to "SQL Editor"
   - Copy and paste the contents of `database-setup.sql`
   - Run the script to create tables, functions, and security policies

3. **Configure Authentication**:
   - Go to "Authentication" > "Providers"
   - Enable Google provider
   - Configure OAuth app in Google Console
   - Add redirect URLs: `http://localhost:3000/auth/callback` and your production URL

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project settings > API.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Database Schema

The application uses three main tables:

- **polls**: Stores poll information (title, description, creator, expiry)
- **poll_options**: Stores individual options for each poll
- **votes**: Stores user votes (one vote per user per poll)

## 🔒 Security Features

- **Row Level Security (RLS)**: Protects data at the database level
- **Authentication Required**: Users must sign in to vote or create polls
- **Vote Integrity**: Prevents duplicate votes and tampering
- **Data Validation**: Input sanitization and validation

## 🚀 Deployment to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy!

3. **Update Supabase Settings**:
   - Add your Vercel domain to Supabase Auth redirect URLs
   - Update CORS settings if needed

## 📱 Usage

### For Voters:
1. Sign in with Google
2. Browse active polls
3. Click on an option to vote
4. View real-time results after voting

### For Poll Creators:
1. Sign in to the application
2. Click "Create Poll" tab
3. Fill in poll details and options
4. Set optional expiry date
5. Submit to make poll live

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 💡 Features to Add

- [ ] Poll analytics and statistics
- [ ] Comment system for polls
- [ ] Poll categories and tags
- [ ] Email notifications
- [ ] Dark mode toggle
- [ ] Advanced poll types (ranked choice, etc.)
- [ ] Poll sharing via URL
- [ ] Export results to CSV

## 🐛 Troubleshooting

### Common Issues:

1. **Environment Variables**: Make sure `.env.local` is properly configured
2. **Database Setup**: Ensure all SQL scripts have been run in Supabase
3. **Auth Issues**: Verify OAuth provider configuration
4. **CORS Errors**: Check Supabase project settings

### Getting Help:

- Check the browser console for error messages
- Verify Supabase logs in the dashboard
- Ensure all dependencies are installed

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and Supabase
