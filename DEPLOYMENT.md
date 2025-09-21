# Deployment Guide

This guide covers deploying the Safe Communication Rewriter system to various platforms.

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

### Quick Start

1. **Clone and Setup**
```bash
git clone https://github.com/your-username/safe-communication-rewriter.git
cd safe-communication-rewriter
```

2. **Environment Configuration**
```bash
cp backend/env.example .env
nano .env
```

3. **Start Services**
```bash
docker-compose up -d
```

4. **Verify Deployment**
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Test endpoints
curl http://localhost/api/health
curl http://localhost
```

### Production Configuration

For production deployment, update the following in `.env`:

```env
NODE_ENV=production
MONGODB_URI=mongodb://admin:strong-password@mongodb:27017/safe_communication_rewriter?authSource=admin
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
CORS_ORIGIN=https://yourdomain.com
```

## ☁️ Cloud Deployment

### Vercel (Frontend)

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `frontend` folder as root directory

2. **Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-api-domain.com
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - Custom domain can be configured in project settings

### Render (Backend)

1. **Create Web Service**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configuration**
   ```
   Build Command: cd backend && npm install && npm run build
   Start Command: cd backend && npm start
   Root Directory: backend
   ```

3. **Environment Variables**
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/safe_communication_rewriter
   REDIS_URL=redis://username:password@host:port
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your-super-secure-jwt-secret
   ```

4. **Deploy**
   - Render will automatically deploy on push to main branch
   - Health checks are configured automatically

### AWS ECS

1. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name safe-rewriter-cluster
```

2. **Build and Push Images**
```bash
# Build backend image
docker build -t safe-rewriter-backend ./backend
docker tag safe-rewriter-backend:latest your-account.dkr.ecr.region.amazonaws.com/safe-rewriter-backend:latest
docker push your-account.dkr.ecr.region.amazonaws.com/safe-rewriter-backend:latest

# Build frontend image
docker build -t safe-rewriter-frontend ./frontend
docker tag safe-rewriter-frontend:latest your-account.dkr.ecr.region.amazonaws.com/safe-rewriter-frontend:latest
docker push your-account.dkr.ecr.region.amazonaws.com/safe-rewriter-frontend:latest
```

3. **Create Task Definitions**
   - Use the provided Docker images
   - Configure environment variables
   - Set resource limits (CPU: 512, Memory: 1024)

4. **Create Services**
   - Backend service on port 3001
   - Frontend service on port 3000
   - Configure load balancer

### Google Cloud Run

1. **Enable APIs**
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

2. **Deploy Backend**
```bash
cd backend
gcloud run deploy safe-rewriter-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

3. **Deploy Frontend**
```bash
cd frontend
gcloud run deploy safe-rewriter-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=https://safe-rewriter-backend-xxx-uc.a.run.app
```

### Azure Container Instances

1. **Create Resource Group**
```bash
az group create --name safe-rewriter-rg --location eastus
```

2. **Deploy Backend**
```bash
az container create \
  --resource-group safe-rewriter-rg \
  --name safe-rewriter-backend \
  --image your-registry.azurecr.io/safe-rewriter-backend:latest \
  --ports 3001 \
  --environment-variables NODE_ENV=production
```

3. **Deploy Frontend**
```bash
az container create \
  --resource-group safe-rewriter-rg \
  --name safe-rewriter-frontend \
  --image your-registry.azurecr.io/safe-rewriter-frontend:latest \
  --ports 3000 \
  --environment-variables NEXT_PUBLIC_API_URL=http://backend-ip:3001
```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create new cluster
   - Choose region closest to your deployment

2. **Configure Access**
   - Create database user
   - Whitelist deployment IP addresses
   - Get connection string

3. **Connection String Format**
```
mongodb+srv://username:password@cluster.mongodb.net/safe_communication_rewriter?retryWrites=true&w=majority
```

### Self-Hosted MongoDB

1. **Install MongoDB**
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

2. **Configure Security**
```bash
# Create admin user
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "strong-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
```

## 🔄 CI/CD Pipeline

### GitHub Actions

The repository includes a complete CI/CD pipeline:

1. **Test Stage**
   - Runs unit tests
   - Security scanning
   - Code quality checks

2. **Build Stage**
   - Builds Docker images
   - Pushes to registry
   - Creates deployment artifacts

3. **Deploy Stage**
   - Deploys to staging
   - Runs smoke tests
   - Deploys to production

### Custom Pipeline

```yaml
# .github/workflows/custom-deploy.yml
name: Custom Deployment

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Custom Platform
        run: |
          # Your deployment commands here
          echo "Deploying to custom platform..."
```

## 📊 Monitoring Setup

### Application Monitoring

1. **Health Checks**
   - Backend: `/api/health`
   - Frontend: `/api/health`
   - Database: MongoDB connection status
   - Cache: Redis connection status

2. **Logging**
   - Structured JSON logs
   - Log aggregation (ELK Stack, Fluentd)
   - Error tracking (Sentry, Bugsnag)

3. **Metrics**
   - Response times
   - Error rates
   - Cache hit rates
   - User analytics

### Infrastructure Monitoring

1. **Server Metrics**
   - CPU usage
   - Memory usage
   - Disk space
   - Network I/O

2. **Database Metrics**
   - Connection count
   - Query performance
   - Storage usage
   - Replication lag

3. **Alerting**
   - Set up alerts for critical metrics
   - Configure notification channels
   - Test alerting system

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Obtain SSL Certificate**
   - Use Let's Encrypt for free certificates
   - Or purchase from certificate authority

2. **Configure Nginx**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

### Environment Security

1. **Secrets Management**
   - Use environment variables
   - Never commit secrets to repository
   - Use secret management services (AWS Secrets Manager, Azure Key Vault)

2. **Network Security**
   - Configure firewalls
   - Use VPCs for cloud deployments
   - Enable DDoS protection

3. **Access Control**
   - Use strong passwords
   - Enable 2FA for admin accounts
   - Regular security audits

## 🚨 Troubleshooting

### Common Issues

1. **Service Won't Start**
```bash
# Check logs
docker-compose logs service-name

# Check resource usage
docker stats

# Restart service
docker-compose restart service-name
```

2. **Database Connection Issues**
```bash
# Test MongoDB connection
mongo "mongodb://username:password@host:port/database"

# Check MongoDB logs
docker-compose logs mongodb
```

3. **API Errors**
```bash
# Check API logs
docker-compose logs backend

# Test API endpoint
curl -X POST http://localhost/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{"message":"test message"}'
```

4. **Frontend Build Issues**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Check for dependency issues
npm audit
```

### Performance Optimization

1. **Database Optimization**
   - Create proper indexes
   - Monitor slow queries
   - Optimize connection pooling

2. **Caching Strategy**
   - Enable Redis caching
   - Configure appropriate TTL
   - Monitor cache hit rates

3. **CDN Setup**
   - Use CDN for static assets
   - Configure proper caching headers
   - Enable compression

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer**
   - Use nginx or cloud load balancer
   - Configure health checks
   - Enable sticky sessions if needed

2. **Database Scaling**
   - Use MongoDB replica sets
   - Implement read replicas
   - Consider sharding for large datasets

3. **Cache Scaling**
   - Use Redis Cluster
   - Implement cache warming
   - Monitor cache performance

### Vertical Scaling

1. **Resource Allocation**
   - Increase CPU/memory as needed
   - Monitor resource usage
   - Set up auto-scaling policies

2. **Database Optimization**
   - Optimize queries
   - Add more indexes
   - Increase connection limits

## 🔄 Backup and Recovery

### Database Backup

1. **MongoDB Backup**
```bash
# Create backup
mongodump --uri="mongodb://username:password@host:port/database" --out=/backup/path

# Restore backup
mongorestore --uri="mongodb://username:password@host:port/database" /backup/path
```

2. **Automated Backups**
```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

### Application Backup

1. **Configuration Backup**
   - Backup environment files
   - Backup SSL certificates
   - Backup nginx configuration

2. **Code Backup**
   - Use Git for version control
   - Tag releases
   - Keep deployment artifacts

### Disaster Recovery

1. **Recovery Plan**
   - Document recovery procedures
   - Test recovery regularly
   - Keep backups in multiple locations

2. **RTO/RPO Targets**
   - Recovery Time Objective: 4 hours
   - Recovery Point Objective: 1 hour
   - Regular testing and validation

---

For additional support, please refer to the main [README.md](README.md) or contact the development team.
