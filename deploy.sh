#!/bin/bash

# Murimi POS Production Deployment Script
# This script automates the deployment of Murimi POS to production

set -e

echo "🚀 Starting Murimi POS Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required environment variables are set
check_env_vars() {
    echo -e "${BLUE}🔍 Checking environment variables...${NC}"
    
    required_vars=(
        "DATABASE_URL"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY"
        "MPESA_CONSUMER_KEY"
        "MPESA_CONSUMER_SECRET"
        "MPESA_BUSINESS_SHORT_CODE"
        "MPESA_PASSKEY"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        printf '   %s\n' "${missing_vars[@]}"
        echo -e "${YELLOW}💡 Please set these variables in your .env.local file${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    
    if command -v npm &> /dev/null; then
        npm install --legacy-peer-deps
    elif command -v yarn &> /dev/null; then
        yarn install
    elif command -v pnpm &> /dev/null; then
        pnpm install
    else
        echo -e "${RED}❌ No package manager found (npm, yarn, or pnpm)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
}

# Generate Prisma client
generate_prisma() {
    echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
    
    npx prisma generate
    echo -e "${GREEN}✅ Prisma client generated${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    
    read -p "Do you want to run database migrations? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx prisma db push
        echo -e "${GREEN}✅ Database migrations completed${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipping database migrations${NC}"
    fi
}

# Build the application
build_application() {
    echo -e "${BLUE}🏗️  Building application...${NC}"
    
    if command -v npm &> /dev/null; then
        npm run build
    elif command -v yarn &> /dev/null; then
        yarn build
    elif command -v pnpm &> /dev/null; then
        pnpm build
    fi
    
    echo -e "${GREEN}✅ Application built successfully${NC}"
}

# Run health checks
health_checks() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Check if build files exist
    if [ ! -d ".next" ]; then
        echo -e "${RED}❌ Build directory (.next) not found${NC}"
        exit 1
    fi
    
    # Check if Prisma client exists
    if [ ! -f "node_modules/.prisma/client/index.js" ]; then
        echo -e "${RED}❌ Prisma client not generated${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Health checks passed${NC}"
}

# Setup monitoring
setup_monitoring() {
    echo -e "${BLUE}📊 Setting up monitoring...${NC}"
    
    # Create monitoring directory
    mkdir -p monitoring
    
    # Create basic health check endpoint
    cat > monitoring/health-check.js << 'EOF'
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Health check passed');
    process.exit(0);
  } else {
    console.log(`❌ Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.log(`❌ Health check failed: ${err.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();
EOF
    
    echo -e "${GREEN}✅ Monitoring setup completed${NC}"
}

# Deploy to cloud platform
deploy_cloud() {
    echo -e "${BLUE}☁️  Cloud deployment options:${NC}"
    echo "1. Vercel (Recommended for Next.js)"
    echo "2. AWS (Amazon Web Services)"
    echo "3. Google Cloud Platform"
    echo "4. DigitalOcean"
    echo "5. Manual deployment"
    
    read -p "Select deployment platform (1-5): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
            if command -v vercel &> /dev/null; then
                vercel --prod
            else
                echo -e "${YELLOW}📦 Installing Vercel CLI...${NC}"
                npm install -g vercel
                vercel --prod
            fi
            ;;
        2)
            echo -e "${BLUE}🚀 Deploying to AWS...${NC}"
            echo -e "${YELLOW}💡 Please configure AWS CLI and run: ${NC}"
            echo "aws s3 sync .next/ s3://your-bucket-name"
            ;;
        3)
            echo -e "${BLUE}🚀 Deploying to Google Cloud...${NC}"
            echo -e "${YELLOW}💡 Please configure gcloud CLI and run: ${NC}"
            echo "gcloud run deploy murimi-pos --source ."
            ;;
        4)
            echo -e "${BLUE}🚀 Deploying to DigitalOcean...${NC}"
            echo -e "${YELLOW}💡 Please configure doctl CLI and run: ${NC}"
            echo "doctl apps create --spec .do/app.yaml"
            ;;
        5)
            echo -e "${YELLOW}📋 Manual deployment instructions:${NC}"
            echo "1. Copy the .next build folder to your server"
            echo "2. Install Node.js 18+ on your server"
            echo "3. Run: npm install --production"
            echo "4. Run: npm start"
            ;;
        *)
            echo -e "${RED}❌ Invalid option${NC}"
            ;;
    esac
}

# Main deployment flow
main() {
    echo -e "${GREEN}🎯 Murimi POS Production Deployment${NC}"
    echo "========================================"
    
    check_env_vars
    install_dependencies
    generate_prisma
    run_migrations
    build_application
    health_checks
    setup_monitoring
    
    echo -e "${GREEN}🎉 Deployment preparation completed!${NC}"
    
    read -p "Do you want to deploy to cloud? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_cloud
    else
        echo -e "${YELLOW}💡 To deploy manually, run: npm start${NC}"
    fi
    
    echo -e "${GREEN}🚀 Murimi POS is ready for production!${NC}"
}

# Run the deployment
main "$@"