#!/bin/bash

# ZANTARA PHI - Local Deployment Script
# Deploys ZANTARA PHI locally with ngrok tunnel or fallback options

set -e

PROJECT_DIR="/Users/antonellosiano/Desktop/ZANTARA PHI/monastery-stack"
PORT=3618
LOGS_DIR="$PROJECT_DIR/logs"
PID_FILE="$PROJECT_DIR/zantara.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[ZANTARA]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create logs directory
mkdir -p "$LOGS_DIR"

# Function to check if port is available
check_port() {
    if lsof -i:$PORT >/dev/null 2>&1; then
        warning "Port $PORT is already in use"
        if pgrep -f "src/web/server.ts" >/dev/null; then
            log "ZANTARA PHI server is already running"
            return 1
        else
            error "Another service is using port $PORT"
            exit 1
        fi
    fi
    return 0
}

# Function to install PM2 if not available
install_pm2() {
    if ! command -v pm2 >/dev/null 2>&1; then
        log "Installing PM2..."
        npm install -g pm2
        success "PM2 installed successfully"
    else
        log "PM2 is already installed"
    fi
}

# Function to start server with PM2
start_with_pm2() {
    log "Starting ZANTARA PHI with PM2..."

    cd "$PROJECT_DIR"

    # Stop existing instance if running
    pm2 delete zantara-phi 2>/dev/null || true

    # Start with PM2
    pm2 start ecosystem.config.js --env production

    # Save PM2 configuration
    pm2 save

    # Setup PM2 startup (optional)
    if command -v systemctl >/dev/null 2>&1; then
        log "Setting up PM2 startup script..."
        pm2 startup systemd -u $USER --hp $HOME
    fi

    success "ZANTARA PHI started with PM2"
    pm2 status
}

# Function to start server with forever (fallback)
start_with_forever() {
    if ! command -v forever >/dev/null 2>&1; then
        log "Installing forever..."
        npm install -g forever
    fi

    log "Starting ZANTARA PHI with forever..."

    cd "$PROJECT_DIR"

    # Stop existing instance
    forever stop src/web/server.ts 2>/dev/null || true

    # Start with forever
    forever -l "$LOGS_DIR/forever.log" -o "$LOGS_DIR/out.log" -e "$LOGS_DIR/err.log" start src/web/server.ts

    success "ZANTARA PHI started with forever"
    forever list
}

# Function to start server with nohup (basic fallback)
start_with_nohup() {
    log "Starting ZANTARA PHI with nohup..."

    cd "$PROJECT_DIR"

    # Kill existing process if running
    if [ -f "$PID_FILE" ]; then
        kill $(cat "$PID_FILE") 2>/dev/null || true
        rm -f "$PID_FILE"
    fi

    # Start with nohup
    nohup npm run web > "$LOGS_DIR/nohup.out" 2>&1 &
    echo $! > "$PID_FILE"

    success "ZANTARA PHI started with nohup (PID: $(cat $PID_FILE))"
}

# Function to setup ngrok tunnel
setup_ngrok() {
    if command -v ngrok >/dev/null 2>&1; then
        log "Setting up ngrok tunnel..."

        # Kill existing ngrok processes
        pkill -f ngrok 2>/dev/null || true

        # Start ngrok in background
        nohup ngrok http $PORT > "$LOGS_DIR/ngrok.log" 2>&1 &

        # Wait for ngrok to start
        sleep 3

        # Get ngrok URL
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok\.io' | head -n1)

        if [ -n "$NGROK_URL" ]; then
            success "ngrok tunnel established:"
            echo -e "${PURPLE}Public URL: $NGROK_URL${NC}"
            echo -e "${BLUE}Local URL:  http://localhost:$PORT${NC}"
            echo "$NGROK_URL" > "$PROJECT_DIR/ngrok-url.txt"
        else
            warning "Failed to get ngrok URL, check logs: $LOGS_DIR/ngrok.log"
        fi
    else
        warning "ngrok not found in PATH. Install ngrok for public access."
    fi
}

# Function to create systemd service (optional)
create_systemd_service() {
    if [ "$1" = "--systemd" ] && command -v systemctl >/dev/null 2>&1; then
        log "Creating systemd service..."

        sudo tee /etc/systemd/system/zantara-phi.service > /dev/null <<EOF
[Unit]
Description=ZANTARA PHI Monastery Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/npm run web
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
EOF

        sudo systemctl daemon-reload
        sudo systemctl enable zantara-phi
        sudo systemctl start zantara-phi

        success "Systemd service created and started"
        sudo systemctl status zantara-phi
    fi
}

# Function to display status
show_status() {
    echo -e "\n${PURPLE}🏛️  ZANTARA PHI Deployment Status${NC}"
    echo "================================="

    # Check if server is responding
    if curl -s "http://localhost:$PORT/api/health" >/dev/null; then
        success "Server is responding on port $PORT"

        # Show ngrok URL if available
        if [ -f "$PROJECT_DIR/ngrok-url.txt" ]; then
            NGROK_URL=$(cat "$PROJECT_DIR/ngrok-url.txt")
            echo -e "${PURPLE}Public URL: $NGROK_URL${NC}"
        fi

        echo -e "${BLUE}Local URLs:${NC}"
        echo -e "  Dashboard: http://localhost:$PORT/"
        echo -e "  Health:    http://localhost:$PORT/api/health"
        echo -e "  Stats:     http://localhost:$PORT/api/stats"
    else
        error "Server is not responding on port $PORT"
    fi

    # Show process information
    if command -v pm2 >/dev/null 2>&1; then
        echo -e "\n${BLUE}PM2 Status:${NC}"
        pm2 status zantara-phi 2>/dev/null || echo "Not running with PM2"
    fi

    # Show logs location
    echo -e "\n${BLUE}Log files:${NC}"
    echo -e "  Directory: $LOGS_DIR"
    if [ -f "$LOGS_DIR/pm2-combined.log" ]; then
        echo -e "  PM2 logs:  $LOGS_DIR/pm2-combined.log"
    fi
    if [ -f "$LOGS_DIR/ngrok.log" ]; then
        echo -e "  ngrok log: $LOGS_DIR/ngrok.log"
    fi
}

# Main deployment logic
main() {
    echo -e "${PURPLE}🏛️  ZANTARA PHI - Local Deployment${NC}"
    echo "=================================="

    cd "$PROJECT_DIR"

    # Parse arguments
    USE_PM2=true
    CREATE_SYSTEMD=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-pm2)
                USE_PM2=false
                shift
                ;;
            --systemd)
                CREATE_SYSTEMD=true
                shift
                ;;
            --status)
                show_status
                exit 0
                ;;
            --stop)
                log "Stopping ZANTARA PHI..."
                pm2 delete zantara-phi 2>/dev/null || true
                forever stop src/web/server.ts 2>/dev/null || true
                if [ -f "$PID_FILE" ]; then
                    kill $(cat "$PID_FILE") 2>/dev/null || true
                    rm -f "$PID_FILE"
                fi
                pkill -f ngrok 2>/dev/null || true
                success "ZANTARA PHI stopped"
                exit 0
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --no-pm2     Use forever or nohup instead of PM2"
                echo "  --systemd    Create systemd service"
                echo "  --status     Show deployment status"
                echo "  --stop       Stop all ZANTARA PHI processes"
                echo "  --help       Show this help"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Check if already running
    if ! check_port; then
        show_status
        exit 0
    fi

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        npm install
    fi

    # Start server based on preference
    if [ "$USE_PM2" = true ]; then
        install_pm2
        start_with_pm2
    elif command -v forever >/dev/null 2>&1; then
        start_with_forever
    else
        start_with_nohup
    fi

    # Wait for server to start
    log "Waiting for server to start..."
    sleep 5

    # Setup ngrok tunnel
    setup_ngrok

    # Create systemd service if requested
    if [ "$CREATE_SYSTEMD" = true ]; then
        create_systemd_service --systemd
    fi

    # Show final status
    show_status

    echo -e "\n${GREEN}🏛️  ZANTARA PHI deployment complete!${NC}"
    echo -e "Run ${YELLOW}$0 --status${NC} to check status"
    echo -e "Run ${YELLOW}$0 --stop${NC} to stop all processes"
}

# Execute main function with all arguments
main "$@"