# 🔧 DevOps Guide: Fixing Domain-to-IP Address Switching Issues

## Executive Summary
Your website switches from `https://dtps.tech` to `http://10.242.42.127:3000` during:
- Internet disconnection
- Server/system restart
- DNS resolver failure
- Application restart

**Root Cause:** Multiple layers of misconfiguration across DNS, reverse proxy, application binding, and environment variables.

---

## Part 1: WHY THIS ISSUE OCCURS

### 1.1 The Private IP Range Problem

**What is 10.x.x.x?**
```
10.0.0.0 - 10.255.255.255  (RFC 1918 Private IP Range)
- Only routable within your local network
- NOT routable on the internet
- Assigned by DHCP or static configuration
```

**Your situation:**
```
Your Server:
  Public Domain: dtps.tech (resolves to external IP via DNS)
  Private IP: 10.242.42.127 (internal network interface)
  
When DNS fails → Application falls back to private IP
```

### 1.2 DNS Failure Cascade

```
Normal Flow:
┌─────────────────────────────────────────────────────┐
│ User requests: https://dtps.tech                     │
└─────────────────┬───────────────────────────────────┘
                  ↓
        ┌─────────────────────┐
        │  DNS Resolver       │
        │  (8.8.8.8 or ISP)   │
        └────────┬────────────┘
                 ↓
    dtps.tech → 203.0.113.45 (Your Public IP)
                 ↓
        ┌──────────────────────┐
        │  Nginx (Public IP)   │
        │  :443 Reverse Proxy  │
        └─────────┬────────────┘
                  ↓
        ┌──────────────────────┐
        │  Node.js App         │
        │  127.0.0.1:3000      │
        └──────────────────────┘
                  
FAILURE FLOW (During DNS Loss):
┌─────────────────────────────────────────────────────┐
│ Internet Down / DNS Resolver Unreachable             │
└─────────────────┬───────────────────────────────────┘
                  ↓
    DNS lookup fails for dtps.tech
                  ↓
    Browser gets local cached IP or 10.242.42.127
                  ↓
    Browser/App falls back to: http://10.242.42.127:3000
                  ↓
        ❌ UNREACHABLE FROM OUTSIDE NETWORK
```

### 1.3 Server Binding Issues

**Bad Configuration (Your Current Setup):**
```javascript
// Bad: Binding to specific private IP
app.listen(3000, '10.242.42.127', () => {
  console.log('App running on 10.242.42.127:3000');
});
```

**Problem:**
- If 10.242.42.127 changes (DHCP renewal)
- If network interface resets → binding fails
- Only accessible from within local network

**Good Configuration:**
```javascript
// Good: Bind to all interfaces
app.listen(3000, '0.0.0.0', () => {
  console.log('App listening on all interfaces on port 3000');
});
```

### 1.4 Environment Variable Misconfiguration

```bash
# ❌ BAD: Uses localhost or private IP
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://10.242.42.127:3000
NODE_URL=http://10.242.42.127:3000

# ✅ GOOD: Uses public domain
NEXTAUTH_URL=https://dtps.tech
API_BASE_URL=https://dtps.tech/api
```

**Why it matters:**
- Environment variables are read at startup
- If server restarts, variables may not update correctly
- Application hardcodes the base URL in generated links
- Reset password emails, redirects use the base URL

### 1.5 Nginx Reverse Proxy Misconfiguration

```nginx
# ❌ BAD: Nginx pointing to private IP
upstream app {
    server 10.242.42.127:3000;
}
server {
    listen 443 ssl;
    server_name dtps.tech;
    location / {
        proxy_pass http://app;
        # Missing critical headers!
    }
}

# ✅ GOOD: Correct headers and configuration
upstream app {
    server 127.0.0.1:3000;  # Localhost is fine here (local loop)
    keepalive 64;
}
server {
    listen 443 ssl http2;
    server_name dtps.tech;
    
    location / {
        proxy_pass http://app;
        
        # CRITICAL: Tell app what the original domain was
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

### 1.6 Frontend Hardcoded Base URLs

```javascript
// ❌ BAD: Hardcoded IP in frontend
const API_URL = 'http://10.242.42.127:3000/api';
const BASE_URL = 'http://10.242.42.127:3000';

// ❌ BAD: Using window.location.origin (can be private IP)
const API_URL = `${window.location.origin}/api`;

// ✅ GOOD: Use relative URLs
const API_URL = '/api';

// ✅ GOOD: Environment variable at build time
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

### 1.7 DHCP and Network Interface Issues

```bash
# Your server may get different IP on restart
Before restart:  eth0 = 10.242.42.127
After restart:   eth0 = 10.242.42.128  (DHCP renewal)
                        ↓
              Application fails to bind
              Falls back to any available IP
```

---

## Part 2: HOW TO FIX IT PERMANENTLY

### 2.1 Fix #1: Correct Server Binding

**File: `src/server.js` or `next.config.js` (for Next.js)**

```javascript
// ✅ CORRECT: Bind to 0.0.0.0 (all interfaces)
const app = require('express')();
const PORT = process.env.PORT || 3000;

// Listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on all interfaces on port ${PORT}`);
  console.log(`✓ Access via: http://localhost:${PORT}`);
  console.log(`✓ Access via: http://127.0.0.1:${PORT}`);
  console.log(`✓ Access via: http://10.242.42.127:${PORT} (internal)`);
});
```

**For Next.js (not needed, it defaults to 0.0.0.0):**
```bash
# In package.json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start -p 3000"
}

# Start command binds to 0.0.0.0:3000 by default
```

### 2.2 Fix #2: Proper Environment Variable Configuration

**File: `.env.production` or `.env` (version controlled, not `.env.local`)**

```bash
# ✅ ALWAYS use the domain, NEVER use IP or localhost
NEXTAUTH_URL=https://dtps.tech
NEXTAUTH_SECRET=your-secret-key

# Public API endpoints (for browser)
NEXT_PUBLIC_API_URL=https://dtps.tech/api
NEXT_PUBLIC_BASE_URL=https://dtps.tech

# Internal server URLs (only for server-side)
INTERNAL_API_URL=http://127.0.0.1:3000
```

**Why separate files:**
```
.env.local       → ❌ NOT versioned (for local development)
.env.production  → ✅ Versioned (for production)

Production server loads:
1. .env (defaults)
2. .env.production (overrides for prod)
```

**Ensure variables are loaded correctly:**
```javascript
// ✅ CORRECT: Function to get base URL safely
export function getBaseUrl(): string {
  // For browser/client-side
  if (typeof window !== 'undefined') {
    // Always use NEXT_PUBLIC_BASE_URL
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://dtps.tech';
  }

  // For server-side
  const env = process.env.NEXTAUTH_URL;
  
  if (!env) {
    console.error('❌ NEXTAUTH_URL not set in environment');
    return 'https://dtps.tech'; // Fallback
  }

  return env;
}

// Usage in reset password email
const resetLink = `${getBaseUrl()}/auth/reset-password?token=${token}`;
```

### 2.3 Fix #3: Nginx Reverse Proxy Configuration

**File: `/etc/nginx/sites-available/dtps-tech`**

```nginx
# Upstream to Node.js (use localhost, NOT private IP)
upstream nodejs_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name dtps.tech www.dtps.tech;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name dtps.tech www.dtps.tech;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/dtps.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dtps.tech/privkey.pem;
    
    # SSL Configuration (security best practices)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Enable HSTS (force HTTPS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy Configuration
    location / {
        proxy_pass http://nodejs_app;
        
        # ⚠️ CRITICAL: Pass original domain info to app
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Connection settings
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        
        # Timeouts
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # API endpoints (no caching)
    location /api/ {
        proxy_pass http://nodejs_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_pragma $http_authorization;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Static files (aggressive caching)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://nodejs_app;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/dtps-tech /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

### 2.4 Fix #4: Static IP for Your Server

**Option A: Static IP at Host Level**

```bash
# On your server/VM
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 10.242.42.127/24  # Static private IP
      gateway4: 10.242.42.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

```bash
sudo netplan apply
sudo systemctl restart networking
```

**Option B: DHCP Reservation**

If using a DHCP server (router), reserve the IP for your server's MAC address:
- Router admin panel → DHCP Reservation
- MAC: 00:11:22:33:44:55 → Always assign 10.242.42.127

### 2.5 Fix #5: Process Manager Configuration (PM2)

**File: `ecosystem.config.js`**

```javascript
module.exports = {
  apps: [
    {
      name: 'dtps-app',
      script: 'npm',
      args: 'start',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXTAUTH_URL: 'https://dtps.tech',
        NEXT_PUBLIC_API_URL: 'https://dtps.tech/api',
      },
      
      // Restart behavior
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Crash handling
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '30s',
      
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 10000,
      shutdown_with_message: true,
      
      // Clustering
      instances: 'max',
      exec_mode: 'cluster',
      
      // Log files
      out_file: '/var/log/dtps/out.log',
      err_file: '/var/log/dtps/error.log',
      log_file: '/var/log/dtps/combined.log',
      
      // Startup hook
      exec_mode_id: 'PM2_app_id',
    }
  ],
  
  deploy: {
    production: {
      user: 'deployer',
      host: '10.242.42.127',
      ref: 'origin/main',
      repo: 'git@github.com:yourorg/dtps.git',
      path: '/var/www/dtps',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production'
    }
  }
};
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save           # Save process list
pm2 startup        # Enable auto-restart on server reboot
pm2 logs           # Monitor logs
```

### 2.6 Fix #6: Docker Compose Best Practices

**File: `docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: dtps-app
    
    # Environment - CRITICAL
    environment:
      NODE_ENV: production
      PORT: 3000
      # ✅ ALWAYS use domain
      NEXTAUTH_URL: https://dtps.tech
      NEXT_PUBLIC_API_URL: https://dtps.tech/api
      NEXT_PUBLIC_BASE_URL: https://dtps.tech
      MONGODB_URI: ${MONGODB_URI}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    
    # Binding - bind to all interfaces
    ports:
      - "3000:3000"  # Bind to 0.0.0.0:3000 inside container
    
    # Network
    networks:
      - dtps-network
    
    # Restart policy - auto-restart
    restart: unless-stopped
    
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    # Volumes
    volumes:
      - ./uploads:/app/uploads
      - /app/node_modules
    
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    
    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

  nginx:
    image: nginx:alpine
    container_name: dtps-nginx
    
    ports:
      - "80:80"
      - "443:443"
    
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./certbot:/var/www/certbot:ro
    
    depends_on:
      - app
    
    networks:
      - dtps-network
    
    restart: unless-stopped
    
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"

  certbot:
    image: certbot/certbot
    container_name: dtps-certbot
    
    volumes:
      - ./certs:/etc/letsencrypt:rw
      - ./certbot:/var/www/certbot:rw
    
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot; sleep 12h & wait $${!}; done;'"
    
    restart: unless-stopped

networks:
  dtps-network:
    driver: bridge
```

**Startup commands:**
```bash
# Build and start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps
docker logs dtps-app | tail -50

# Check env variables loaded
docker exec dtps-app printenv | grep NEXTAUTH
```

---

## Part 3: BEST PRACTICES

### 3.1 Architecture Diagram: Correct Setup

```
INTERNET
  │
  └─── DNS: dtps.tech → 203.0.113.45 (Your Public IP)
           
FIREWALL/ROUTER
  │
  └─── 203.0.113.45:443 (Port forwarding)
  
REVERSE PROXY (Nginx)
  │
  ├─ Listen: 0.0.0.0:80, 0.0.0.0:443
  ├─ Parse Host header
  ├─ Add X-Forwarded-* headers
  │
  └─ Proxy Pass: http://127.0.0.1:3000
     
APPLICATION (Node.js/Next.js)
  │
  ├─ Listen: 0.0.0.0:3000
  ├─ Read NEXTAUTH_URL from env
  ├─ Use X-Forwarded-* headers
  │
  └─ Read: Host = dtps.tech (from Nginx header)
```

### 3.2 Configuration Precedence

```
Priority (Highest → Lowest):

1. X-Forwarded-Host header (from Nginx)
   └─ req.headers['x-forwarded-host'] = 'dtps.tech'

2. Host header (from Nginx)
   └─ req.headers['host'] = 'dtps.tech'

3. Environment variable NEXTAUTH_URL
   └─ process.env.NEXTAUTH_URL = 'https://dtps.tech'

4. Hardcoded fallback
   └─ 'https://dtps.tech'

5. ❌ NEVER use: window.location.origin or server private IP
```

### 3.3 Testing Checklist

```bash
# Test 1: Server binding
lsof -i :3000
# Output should show: node ... 0.0.0.0:3000 (LISTEN)

# Test 2: Nginx reverse proxy
curl -H "Host: dtps.tech" http://localhost
# Output: Should return the app

# Test 3: Headers passed correctly
curl -H "Host: dtps.tech" http://localhost -v
# Check: X-Forwarded-Host, X-Forwarded-Proto

# Test 4: Environment variables
docker exec dtps-app sh -c 'echo $NEXTAUTH_URL'
# Output: https://dtps.tech

# Test 5: Application detects domain
curl -s https://dtps.tech/api/config | jq '.baseUrl'
# Output: https://dtps.tech

# Test 6: After restart
docker-compose -f docker-compose.prod.yml restart app
sleep 3
curl -s https://dtps.tech/api/health
# Output: OK

# Test 7: Reset password email
# 1. Request password reset
# 2. Check email inbox
# 3. Link should be: https://dtps.tech/auth/reset-password?token=...
# ✅ NOT: http://10.242.42.127:3000/...
```

### 3.4 Monitoring and Alerts

**File: `/monitoring/health-check.sh`**

```bash
#!/bin/bash

DOMAIN="dtps.tech"
APP_PORT="3000"
HEALTH_URL="https://${DOMAIN}/health"

echo "=== Health Check: $(date) ==="

# Check 1: Domain resolves
RESOLVED_IP=$(dig +short $DOMAIN)
echo "✓ Domain ${DOMAIN} resolves to: ${RESOLVED_IP}"

# Check 2: Nginx responds
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
if [ "$NGINX_STATUS" = "200" ]; then
    echo "✓ HTTPS working: Status ${NGINX_STATUS}"
else
    echo "❌ HTTPS failing: Status ${NGINX_STATUS}"
    exit 1
fi

# Check 3: App responds
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
if [ "$APP_STATUS" = "200" ]; then
    echo "✓ App healthy: Status ${APP_STATUS}"
else
    echo "❌ App unhealthy: Status ${APP_STATUS}"
    exit 1
fi

# Check 4: No private IPs in response
RESPONSE=$(curl -s $HEALTH_URL)
if echo "$RESPONSE" | grep -q "10\\."; then
    echo "❌ Private IP detected in response!"
    echo "$RESPONSE"
    exit 1
else
    echo "✓ No private IPs in response"
fi

echo "✓ All checks passed"
exit 0
```

**Cron job (run every 5 minutes):**
```bash
*/5 * * * * /opt/dtps/monitoring/health-check.sh >> /var/log/dtps/health.log 2>&1
```

### 3.5 Production Deployment Checklist

```
PRE-DEPLOYMENT:
☐ All hardcoded IPs removed
☐ All hardcoded localhost references removed
☐ NEXTAUTH_URL set to domain (not IP/localhost)
☐ Environment variables in .env.production
☐ Nginx configured with proper headers
☐ SSL/TLS certificates valid
☐ Docker-compose uses domain in env

DEPLOYMENT:
☐ Run: docker-compose -f docker-compose.prod.yml pull
☐ Run: docker-compose -f docker-compose.prod.yml build --no-cache
☐ Run: docker-compose -f docker-compose.prod.yml down
☐ Run: docker-compose -f docker-compose.prod.yml up -d
☐ Wait 30 seconds for startup

POST-DEPLOYMENT:
☐ Check: docker-compose ps (all running)
☐ Check: docker logs dtps-app (no errors)
☐ Check: curl https://dtps.tech/health (200 OK)
☐ Test: Browser https://dtps.tech (loads properly)
☐ Test: Password reset email (has domain URL, not IP)
☐ Monitor: Logs for 10 minutes (no errors)
☐ Verify: Domain resolves correctly (dig dtps.tech)

AFTER RESTART:
☐ Restart server: sudo reboot
☐ Wait 2 minutes
☐ Check: Website loads on domain (not IP)
☐ Check: No 10.x.x.x in browser address bar
☐ Check: Reset password still works with domain URL

ONGOING:
☐ Daily: Monitor logs for IP references
☐ Weekly: Check SSL certificate expiry
☐ Monthly: Review environment variables
☐ Monthly: Test password reset flow
```

---

## Part 4: Complete Implementation Example

### 4.1 Next.js Application Setup

**File: `src/lib/config.ts`**

```typescript
/**
 * Get base URL for the application
 * Uses environment variables, never hardcoded IPs
 */
export function getBaseUrl(): string {
  // Server-side
  if (typeof window === 'undefined') {
    const url = process.env.NEXTAUTH_URL;
    if (!url) {
      throw new Error('NEXTAUTH_URL not set');
    }
    return url;
  }

  // Browser/Client-side
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://dtps.tech';
}

/**
 * Get API base URL
 */
export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    // Server: use internal URL for faster requests
    return process.env.INTERNAL_API_URL || 'http://127.0.0.1:3000';
  }

  // Browser: use public domain
  return process.env.NEXT_PUBLIC_API_URL || 'https://dtps.tech/api';
}

/**
 * Build full URL with protocol
 */
export function buildUrl(path: string): string {
  const baseUrl = getBaseUrl();
  return new URL(path, baseUrl).toString();
}
```

**File: `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth";
import { getBaseUrl } from "@/lib/config";

const handler = NextAuth({
  providers: [
    // Your providers
  ],
  
  callbacks: {
    async redirect({ url, baseUrl }) {
      // ✅ Always use configured baseUrl, never window.location
      return url.startsWith(baseUrl) 
        ? url 
        : baseUrl;
    },
    
    async signIn({ user, account }) {
      return true;
    },
  },
  
  // ✅ Use environment variable
  secret: process.env.NEXTAUTH_SECRET,
  
  // ✅ Use proper base URL
  pages: {
    signIn: `${getBaseUrl()}/login`,
    signOut: `${getBaseUrl()}/logout`,
    error: `${getBaseUrl()}/auth/error`,
    verifyRequest: `${getBaseUrl()}/auth/verify-request`,
  },
});

export { handler as GET, handler as POST };
```

**File: `src/app/api/user/forget-password/route.ts`**

```typescript
import { getBaseUrl } from "@/lib/config";

export async function POST(request: Request) {
  const { email } = await request.json();

  // ... find user ...

  // ✅ Use getBaseUrl() for reset link
  const resetLink = new URL(
    `/auth/reset-password?token=${token}`,
    getBaseUrl()
  ).toString();

  // Send email with resetLink
  await sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html: `
      <p>Click the link to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 1 hour.</p>
    `,
  });

  return Response.json({ success: true });
}
```

### 4.2 Environment Files

**File: `.env` (git ignored - local only)**

```bash
# For local development
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/dtps
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key
```

**File: `.env.production` (git tracked - for production)**

```bash
# For production
NODE_ENV=production
NEXTAUTH_URL=https://dtps.tech
NEXT_PUBLIC_API_URL=https://dtps.tech/api
NEXT_PUBLIC_BASE_URL=https://dtps.tech
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}  # Set via CI/CD
DATABASE_URL=${DATABASE_URL}         # Set via CI/CD
```

**File: `.dockerignore`**

```
.env
.env.local
.env.*.local
node_modules
.next
```

**File: `Dockerfile.prod`**

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ✅ Build args for env variables
ARG NEXTAUTH_URL=https://dtps.tech
ARG NEXT_PUBLIC_API_URL=https://dtps.tech/api
ARG NEXT_PUBLIC_BASE_URL=https://dtps.tech

ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

RUN npm run build

# Production runtime
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# ✅ Bind to 0.0.0.0
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Part 5: FINAL CHECKLIST FOR PRODUCTION DEPLOYMENT

```
STEP 1: Code Changes
  ☐ Remove all hardcoded IPs (10.x.x.x, 192.x.x.x, etc.)
  ☐ Remove all hardcoded localhost references
  ☐ Update all reset password/email links to use getBaseUrl()
  ☐ Use relative URLs where possible (/api instead of http://...)
  ☐ Implement config.ts with getBaseUrl() function
  ☐ Git commit and tag release

STEP 2: Environment Configuration
  ☐ Create .env.production with domain URLs
  ☐ Set NEXTAUTH_URL=https://dtps.tech
  ☐ Set NEXT_PUBLIC_BASE_URL=https://dtps.tech
  ☐ Verify .env is in .gitignore
  ☐ Ensure production env vars are NOT in git
  ☐ Store secrets in secure CI/CD system

STEP 3: Nginx Configuration
  ☐ Update nginx.conf with correct reverse proxy
  ☐ Add X-Forwarded-* headers
  ☐ Set upstream to 127.0.0.1:3000 (NOT private IP)
  ☐ Enable HSTS header
  ☐ Configure SSL/TLS properly
  ☐ Test: nginx -t
  ☐ Restart: systemctl restart nginx

STEP 4: Docker/Container Setup
  ☐ Update Dockerfile to expose port 3000
  ☐ Update docker-compose.prod.yml with domain env vars
  ☐ Verify ports binding to 0.0.0.0
  ☐ Set resource limits
  ☐ Configure restart policy: unless-stopped
  ☐ Configure health checks

STEP 5: Application Server
  ☐ Update app to listen on 0.0.0.0:3000
  ☐ Configure PM2/systemd with env vars
  ☐ Set auto-restart on failure
  ☐ Set auto-restart on boot
  ☐ Configure log rotation

STEP 6: Network & Infrastructure
  ☐ Set static IP for server (if DHCP)
  ☐ Configure DNS: dtps.tech → Public IP
  ☐ Configure firewall: allow 80, 443 to public
  ☐ Configure port forwarding on router
  ☐ Verify SSL certificate is valid

STEP 7: Deployment
  ☐ Take backup of current production
  ☐ Deploy code changes
  ☐ Rebuild Docker image with production env
  ☐ Pull latest image: docker-compose pull
  ☐ Restart containers: docker-compose restart
  ☐ Wait 30 seconds for full startup

STEP 8: Verification (Production)
  ☐ Check: https://dtps.tech loads
  ☐ Check: Browser address bar shows domain (not IP)
  ☐ Check: No 10.x.x.x or 192.x.x.x anywhere
  ☐ Check: SSL certificate valid (lock icon)
  ☐ Check: Network requests to /api/* (not to IP)
  ☐ Check: Logs show no errors

STEP 9: Advanced Testing
  ☐ Test: Password reset email has domain URL
  ☐ Test: Redirects after auth use domain
  ☐ Test: All third-party integrations use domain
  ☐ Test: Mobile phone can access (not local network)
  ☐ Test: VPN to remote location can access

STEP 10: After Restart
  ☐ Restart server: sudo reboot
  ☐ Wait 2 minutes for full startup
  ☐ Verify: https://dtps.tech still works
  ☐ Verify: No IP address in browser
  ☐ Check: Application logs are clean
  ☐ Monitor: Application for 1 hour

STEP 11: Continuous Monitoring
  ☐ Setup: Health check monitoring
  ☐ Setup: Log aggregation (ELK / Datadog)
  ☐ Setup: Alert on domain changes to IP
  ☐ Setup: Certificate expiry alerts
  ☐ Daily: Review logs for IP references
  ☐ Weekly: Test reset password functionality
```

---

## Quick Reference: Common Mistakes

```
❌ MISTAKE 1: App binding to specific IP
   app.listen(3000, '10.242.42.127')
✅ FIX: Bind to all interfaces
   app.listen(3000, '0.0.0.0')

❌ MISTAKE 2: Hardcoded IP in environment
   NEXTAUTH_URL=http://10.242.42.127:3000
✅ FIX: Use domain
   NEXTAUTH_URL=https://dtps.tech

❌ MISTAKE 3: Email links with private IP
   resetLink = 'http://10.242.42.127:3000/reset?token=...'
✅ FIX: Use domain
   resetLink = 'https://dtps.tech/reset?token=...'

❌ MISTAKE 4: Nginx upstream points to private IP
   upstream app { server 10.242.42.127:3000; }
✅ FIX: Use localhost (for local proxy)
   upstream app { server 127.0.0.1:3000; }

❌ MISTAKE 5: Missing X-Forwarded headers in Nginx
   (App doesn't know original domain)
✅ FIX: Add headers
   proxy_set_header Host $host;
   proxy_set_header X-Forwarded-Proto $scheme;

❌ MISTAKE 6: Using window.location.origin in app
   const API_URL = window.location.origin + '/api'
✅ FIX: Use environment variable
   const API_URL = process.env.NEXT_PUBLIC_API_URL
```

---

## Summary: Root Cause vs Solution

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Website shows private IP | App binding to specific IP | Bind to 0.0.0.0 |
| After restart, IP changes | DHCP renewal or DNS failure | Static IP + proper env vars |
| Reset emails have IP | Hardcoded base URL | Use getBaseUrl() function |
| Nginx can't find app | Upstream points to wrong IP | Point to 127.0.0.1:3000 |
| App doesn't know domain | Missing X-Forwarded headers | Configure in Nginx |
| Domain resolves to IP | DNS failure or cache | Use NEXTAUTH_URL env var |
| Mobile can't access site | Private IP not routable | Ensure domain in address |
| Restart breaks website | No auto-restart config | Configure PM2/systemd |

---

## Production Deployment Command Sequence

```bash
# 1. Prepare
git pull origin main
npm run build

# 2. Update environment
cat .env.production | grep NEXTAUTH_URL
# Should show: NEXTAUTH_URL=https://dtps.tech

# 3. Build and deploy
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify
docker-compose -f docker-compose.prod.yml ps
docker logs dtps-app | tail -30

# 5. Test
curl -s https://dtps.tech/health | jq .
curl -s https://dtps.tech/api/config | jq '.baseUrl'

# 6. Monitor
watch -n 5 'docker logs dtps-app | tail -20'
```

---

**Status:** ✅ **COMPLETE GUIDE FOR PRODUCTION**  
**Created:** February 2, 2026  
**Version:** 1.0 (Complete)
