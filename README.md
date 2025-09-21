# Safe Communication Rewriter

A production-ready AI-powered system for detecting and rewriting scam messages, helping users learn how official bank communications should look. Built with Node.js/Express backend, MongoDB, and Next.js frontend.

## 🚀 Features

### Backend API
- **Google Gemini AI Integration** - Real-time scam message analysis
- **MongoDB Database** - User tracking, history, and pattern learning
- **Redis Caching** - Performance optimization
- **Rate Limiting** - API protection and fair usage
- **Security Middleware** - Helmet, CORS, input validation
- **Comprehensive Logging** - Winston-based structured logging
- **Health Checks** - Service monitoring and status
- **TypeScript** - Full type safety

### Frontend
- **React/Next.js 14** - Modern UI with App Router
- **Tailwind CSS** - Responsive design system
- **Dark Mode** - Complete theme support
- **Animations** - Smooth transitions and micro-interactions
- **Accessibility** - WCAG 2.1 AA compliant
- **PWA Ready** - Offline support and caching
- **Real-time Updates** - Live analysis results

### AI Analysis
- **Scam Detection** - Identifies suspicious patterns
- **Message Rewriting** - Converts to official bank format
- **Difference Analysis** - Highlights key changes
- **Tone Comparison** - Scam vs official communication styles
- **Learning Insights** - Educational content for users
- **Pattern Recognition** - Learns from reported scams

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 7.0+
- Redis 7.0+ (optional)
- Google Gemini API key
- Docker & Docker Compose (for containerized deployment)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/safe-communication-rewriter.git
cd safe-communication-rewriter
```

### 2. Backend Setup

```bash
cd backend
npm install
cp env.example .env
```

Edit `.env` file with your configuration:

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/safe_communication_rewriter
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Clone and setup
git clone https://github.com/your-username/safe-communication-rewriter.git
cd safe-communication-rewriter

# Create environment file
cp backend/env.example .env

# Edit .env with your configuration
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Individual Services

```bash
# Build and run backend
cd backend
docker build -t safe-rewriter-backend .
docker run -p 3001:3001 --env-file .env safe-rewriter-backend

# Build and run frontend
cd frontend
docker build -t safe-rewriter-frontend .
docker run -p 3000:3000 --env-file .env.local safe-rewriter-frontend
```

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### POST /rewrite
Rewrite a scam message using AI.

**Request:**
```json
{
  "message": "Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately",
  "region": "IN",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_message": "Your UPI payment failed! Click here to get refund: http://refund-upi.com immediately",
    "safe_version": "Dear Customer, we noticed an issue with your recent UPI transaction...",
    "differences": [
      {
        "aspect": "Links",
        "scam": "Contains suspicious link",
        "official": "No external links",
        "status": "✅ Fixed"
      }
    ],
    "red_flags_fixed": 4,
    "tone_comparison": {
      "scam": "Urgent, Fearful, Demanding",
      "official": "Professional, Calm, Helpful"
    },
    "key_learning": "Official banks never send links for refunds..."
  },
  "cached": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "gemini": "available"
  }
}
```

#### GET /analytics
Get usage analytics (requires authentication).

**Query Parameters:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `region` - Filter by region
- `userId` - Filter by user

#### POST /patterns
Report a new scam pattern.

**Request:**
```json
{
  "message": "Example scam message",
  "category": "phishing",
  "severity": "high"
}
```

#### GET /patterns/trending
Get trending scam patterns.

**Query Parameters:**
- `limit` - Number of patterns to return (default: 10)

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server
NODE_ENV=production
PORT=3001

# Database
MONGODB_URI=mongodb://localhost:27017/safe_communication_rewriter

# Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=300

# AI Service
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_TOKENS=2048
GEMINI_TEMPERATURE=0.7

# Security
JWT_SECRET=your-super-secret-jwt-key
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=10

# Logging
LOG_LEVEL=info

# Features
MONITORING_ENABLED=true
SECURITY_HEADERS=true
COMPRESSION_ENABLED=true
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

## 🚀 Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Render (Backend)

1. Create new Web Service on Render
2. Connect GitHub repository
3. Set environment variables
4. Deploy automatically

### AWS/GCP/Azure

Use the provided Docker configurations with your preferred container orchestration service.

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:watch
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:watch
```

### Integration Tests
```bash
# Start services
docker-compose up -d

# Run integration tests
npm run test:integration
```

## 📊 Monitoring

### Health Checks
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:3000/api/health`

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Metrics
- Response times
- Cache hit rates
- Error rates
- User analytics

## 🔒 Security

### Implemented Security Measures
- **Rate Limiting** - Prevents abuse
- **Input Validation** - Sanitizes all inputs
- **CORS Protection** - Configurable origins
- **Security Headers** - Helmet.js protection
- **JWT Authentication** - Secure user sessions
- **Environment Isolation** - Separate configs per environment

### Security Best Practices
- Use strong JWT secrets
- Enable HTTPS in production
- Regular dependency updates
- Monitor for vulnerabilities
- Implement proper logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Troubleshooting

#### Common Issues

**1. MongoDB Connection Error**
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check logs
docker-compose logs mongodb
```

**2. Redis Connection Error**
```bash
# Redis is optional, check if it's running
docker-compose ps redis

# Or disable Redis by removing REDIS_URL from .env
```

**3. Gemini API Error**
```bash
# Verify API key is correct
# Check API quota and limits
# Ensure internet connectivity
```

**4. Frontend Build Error**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Getting Help

- 📧 Email: support@safe-rewriter.com
- 💬 Discord: [Join our community](https://discord.gg/safe-rewriter)
- 📖 Documentation: [docs.safe-rewriter.com](https://docs.safe-rewriter.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/safe-communication-rewriter/issues)

## 🗺️ Roadmap

### Upcoming Features
- [ ] Multi-language support
- [ ] Advanced pattern recognition
- [ ] Real-time collaboration
- [ ] Mobile app
- [ ] API rate limiting per user
- [ ] Advanced analytics dashboard
- [ ] Integration with popular email clients
- [ ] Machine learning model training

### Version History
- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added pattern learning and analytics
- **v1.2.0** - Enhanced UI and accessibility features
- **v2.0.0** - Complete rewrite with TypeScript and modern stack

---

Made with ❤️ by the Safe Communication Rewriter Team