#!/bin/bash

# ZANTARA PHI - Health Check Script
# Monitors the local deployment and provides status information

set -e

PORT=3618
API_BASE="http://localhost:$PORT"
PROJECT_DIR="/Users/antonellosiano/Desktop/ZANTARA PHI/monastery-stack"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[HEALTH]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to check HTTP endpoint
check_endpoint() {
    local endpoint="$1"
    local description="$2"
    local timeout="${3:-5}"

    if curl -s --max-time "$timeout" "$API_BASE$endpoint" >/dev/null 2>&1; then
        success "$description"
        return 0
    else
        error "$description"
        return 1
    fi
}

# Function to check API response content
check_api_content() {
    local endpoint="$1"
    local expected_field="$2"
    local description="$3"

    local response=$(curl -s --max-time 5 "$API_BASE$endpoint" 2>/dev/null)
    if echo "$response" | grep -q "\"$expected_field\""; then
        success "$description"
        return 0
    else
        error "$description"
        return 1
    fi
}

# Function to check process status
check_processes() {
    log "Checking process status..."

    # Check if server process is running
    if pgrep -f "src/web/server.ts" >/dev/null; then
        success "Server process is running"
    else
        error "Server process not found"
    fi

    # Check PM2 status
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 status zantara-phi 2>/dev/null | grep -q "online"; then
            success "PM2 process is online"
        else
            warning "PM2 process not running or not found"
        fi
    fi

    # Check ngrok status
    if pgrep -f "ngrok" >/dev/null; then
        success "ngrok tunnel is running"

        # Try to get ngrok URL
        local ngrok_url=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*\.ngrok\.io' | head -n1)
        if [ -n "$ngrok_url" ]; then
            echo -e "  ${PURPLE}Public URL: $ngrok_url${NC}"
        fi
    else
        warning "ngrok tunnel not running"
    fi
}

# Function to check system resources
check_resources() {
    log "Checking system resources..."

    # Check port availability
    if lsof -i:$PORT >/dev/null 2>&1; then
        success "Port $PORT is in use"
    else
        error "Port $PORT is not in use"
    fi

    # Check disk space
    local disk_usage=$(df "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 90 ]; then
        success "Disk usage: ${disk_usage}%"
    else
        warning "Disk usage high: ${disk_usage}%"
    fi

    # Check memory usage for Node.js processes
    local node_memory=$(ps aux | grep node | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
    if [ -n "$node_memory" ]; then
        success "Node.js memory usage: ${node_memory}MB"
    fi
}

# Function to check log files
check_logs() {
    local logs_dir="$PROJECT_DIR/logs"

    if [ -d "$logs_dir" ]; then
        log "Checking log files..."

        for logfile in "$logs_dir"/*.log; do
            if [ -f "$logfile" ]; then
                local size=$(stat -f%z "$logfile" 2>/dev/null || stat -c%s "$logfile" 2>/dev/null)
                local name=$(basename "$logfile")

                if [ "$size" -gt 0 ]; then
                    success "Log file $name: ${size} bytes"

                    # Check for recent errors
                    if tail -n 20 "$logfile" | grep -i "error\|exception\|fail" >/dev/null; then
                        warning "Recent errors found in $name"
                    fi
                else
                    warning "Log file $name is empty"
                fi
            fi
        done
    else
        warning "Logs directory not found"
    fi
}

# Function to run performance test
run_performance_test() {
    log "Running performance test..."

    local start_time=$(date +%s%N)

    if curl -s --max-time 10 "$API_BASE/api/health" >/dev/null; then
        local end_time=$(date +%s%N)
        local duration=$(( (end_time - start_time) / 1000000 ))

        if [ "$duration" -lt 1000 ]; then
            success "Response time: ${duration}ms"
        elif [ "$duration" -lt 3000 ]; then
            warning "Response time: ${duration}ms (slow)"
        else
            error "Response time: ${duration}ms (very slow)"
        fi
    else
        error "Performance test failed"
    fi
}

# Function to display comprehensive status
show_comprehensive_status() {
    echo -e "${PURPLE}🏛️  ZANTARA PHI Health Check Report${NC}"
    echo "===================================="
    echo "Timestamp: $(date)"
    echo ""

    # API Endpoints
    log "Testing API endpoints..."
    check_endpoint "/api/health" "Health endpoint"
    check_endpoint "/api/stats" "Stats endpoint"
    check_endpoint "/" "Dashboard"

    echo ""

    # API Content
    log "Validating API responses..."
    check_api_content "/api/health" "success" "Health response format"
    check_api_content "/api/stats" "phi" "Stats response format"

    echo ""

    # Processes
    check_processes

    echo ""

    # Resources
    check_resources

    echo ""

    # Performance
    run_performance_test

    echo ""

    # Logs
    check_logs

    echo ""
    echo -e "${BLUE}Health check complete.${NC}"
}

# Function to run quick check
run_quick_check() {
    echo -e "${PURPLE}🏛️  ZANTARA PHI Quick Health Check${NC}"
    echo "=================================="

    local all_good=true

    if ! check_endpoint "/api/health" "Health endpoint" 3; then
        all_good=false
    fi

    if ! pgrep -f "src/web/server.ts" >/dev/null; then
        error "Server process not running"
        all_good=false
    fi

    if [ "$all_good" = true ]; then
        success "All systems operational"
        exit 0
    else
        error "Issues detected"
        exit 1
    fi
}

# Function to monitor continuously
monitor_continuous() {
    echo -e "${PURPLE}🏛️  ZANTARA PHI Continuous Monitor${NC}"
    echo "Press Ctrl+C to stop monitoring"
    echo "=================================="

    while true; do
        clear
        echo -e "${BLUE}Monitor - $(date)${NC}"
        echo "========================"

        if check_endpoint "/api/health" "API Health" 2; then
            echo -e "${GREEN}● ZANTARA PHI is running${NC}"
        else
            echo -e "${RED}● ZANTARA PHI is down${NC}"
        fi

        # Show basic stats
        if command -v pm2 >/dev/null 2>&1; then
            echo ""
            pm2 status zantara-phi 2>/dev/null || echo "PM2 not managing process"
        fi

        sleep 5
    done
}

# Main function
main() {
    case "${1:-comprehensive}" in
        "quick")
            run_quick_check
            ;;
        "monitor")
            monitor_continuous
            ;;
        "comprehensive"|"")
            show_comprehensive_status
            ;;
        "--help")
            echo "Usage: $0 [quick|monitor|comprehensive]"
            echo ""
            echo "Commands:"
            echo "  quick         - Quick health check (exit code indicates status)"
            echo "  monitor       - Continuous monitoring (Ctrl+C to stop)"
            echo "  comprehensive - Full health report (default)"
            ;;
        *)
            error "Unknown command: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

main "$@"