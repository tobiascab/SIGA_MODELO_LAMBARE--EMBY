#!/bin/bash
# Ultra-Fast Deploy Script for SIGA
# Uses bind mounts - just rebuild locally and restart container
# Target: ~5-10 seconds for restart after local build

set -e

TARGET=${1:-frontend}
START_TIME=$(date +%s)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}🚀 SIGA Deploy - Target: $TARGET${NC}"
echo "================================"

deploy_frontend() {
    BUILD_START=$(date +%s)
    echo -e "${YELLOW}📦 Rebuilding and deploying frontend container...${NC}"
    cd /home/sigalam/asamblea.cloud
    
    # Force rebuild to pick up source changes
    docker compose up -d --build frontend
    
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))
    echo -e "${CYAN}   Deploy took ${BUILD_TIME}s${NC}"
    
    echo -e "${GREEN}✅ Frontend deployed!${NC}"
}

deploy_backend() {
    BUILD_START=$(date +%s)
    echo -e "${YELLOW}📦 Building backend...${NC}"
    cd /home/sigalam/asamblea.cloud/backend
    
    ./mvnw package -DskipTests -B -q
    
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))
    echo -e "${CYAN}   Build took ${BUILD_TIME}s${NC}"
    
    echo -e "${YELLOW}🔄 Rebuilding and restarting backend container...${NC}"
    cd /home/sigalam/asamblea.cloud
    docker compose up -d --build backend
    
    echo -e "${GREEN}✅ Backend deployed!${NC}"
}

# Just restart without rebuilding (for when you only changed code already built)
restart_frontend() {
    echo -e "${YELLOW}🔄 Restarting frontend container...${NC}"
    docker compose restart frontend
    echo -e "${GREEN}✅ Frontend restarted!${NC}"
}

case $TARGET in
    frontend|f)
        deploy_frontend
        ;;
    backend|b)
        deploy_backend
        ;;
    both|all)
        deploy_frontend
        deploy_backend
        ;;
    restart|r)
        restart_frontend
        ;;
    *)
        echo "Usage: ./deploy.sh [frontend|backend|both|restart]"
        echo "  Shortcuts: f=frontend, b=backend, r=restart"
        exit 1
        ;;
esac

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
if [ $DURATION -le 30 ]; then
    echo -e "${GREEN}⚡ Total time: ${DURATION}s - FAST!${NC}"
elif [ $DURATION -le 60 ]; then
    echo -e "${YELLOW}⏱️  Total time: ${DURATION}s${NC}"
else
    echo -e "⏱️  Total time: ${DURATION}s (build takes most time)"
fi
