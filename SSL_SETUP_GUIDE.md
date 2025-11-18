# 🔒 SSL Certificate Setup Guide for Zoconut

## ✅ **Current Status**
You have successfully obtained an SSL certificate for `dtps.tech` using Let's Encrypt!

```
Certificate: /etc/letsencrypt/live/dtps.tech/fullchain.pem
Private Key: /etc/letsencrypt/live/dtps.tech/privkey.pem
Expires: 2025-12-11
```

## 🚀 **Quick Deployment with SSL**

### **Option 1: Automated SSL Deployment**
```bash
# Make the script executable
chmod +x deploy-ssl.sh

# Run the SSL deployment script
sudo ./deploy-ssl.sh
```

### **Option 2: Manual SSL Deployment**
```bash
# Stop existing containers
docker-compose down

# Pull latest changes
git pull origin main

# Build and start with SSL
docker-compose build --no-cache
docker-compose up -d

# Check status
docker-compose ps
```

## 📋 **What Was Configured**

### **1. Nginx Configuration Updated**
- ✅ **HTTP to HTTPS redirect** on port 80
- ✅ **HTTPS server** on port 443 with SSL
- ✅ **Let's Encrypt certificates** mounted
- ✅ **Modern SSL protocols** (TLSv1.2, TLSv1.3)
- ✅ **Security headers** (HSTS, X-Frame-Options, etc.)
- ✅ **SSL session optimization**

### **2. Docker Compose Updated**
- ✅ **SSL certificate volumes** mounted from `/etc/letsencrypt`
- ✅ **Certbot directory** mounted for renewals
- ✅ **Port 443** exposed for HTTPS

### **3. Environment Variables Updated**
- ✅ **NEXTAUTH_URL** changed to `https://dtps.tech`
- ✅ **Production SSL secret** configured

## 🔧 **SSL Configuration Details**

### **Certificate Paths:**
```
Fullchain: /etc/letsencrypt/live/dtps.tech/fullchain.pem
Private Key: /etc/letsencrypt/live/dtps.tech/privkey.pem
```

### **SSL Security Features:**
- **Modern TLS**: TLSv1.2 and TLSv1.3 only
- **Strong Ciphers**: ECDHE with AES-GCM and ChaCha20-Poly1305
- **HSTS**: Strict Transport Security enabled
- **OCSP Stapling**: Enabled for faster certificate validation
- **Session Resumption**: Optimized for performance

### **Security Headers:**
```
Strict-Transport-Security: max-age=63072000
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## 🔄 **Certificate Renewal**

### **Automatic Renewal**
Let's Encrypt certificates are automatically renewed by certbot. The system is configured for auto-renewal.

### **Manual Renewal**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Restart nginx after renewal
docker-compose restart nginx
```

### **Using Renewal Script**
```bash
# Make executable
chmod +x renew-ssl.sh

# Run renewal script
sudo ./renew-ssl.sh
```

## 🧪 **Testing SSL Setup**

### **Test HTTPS Connection**
```bash
# Test basic HTTPS
curl -I https://dtps.tech

# Test SSL certificate
openssl s_client -servername dtps.tech -connect dtps.tech:443

# Test HTTP redirect
curl -I http://dtps.tech
```

### **Online SSL Tests**
- **SSL Labs**: https://www.ssllabs.com/ssltest/analyze.html?d=dtps.tech
- **SSL Checker**: https://www.sslchecker.com/sslchecker

## 🛡️ **Security Best Practices**

### **Implemented:**
- ✅ **Force HTTPS**: All HTTP traffic redirected to HTTPS
- ✅ **HSTS**: Prevents downgrade attacks
- ✅ **Strong Ciphers**: Modern encryption algorithms
- ✅ **Security Headers**: Protection against common attacks
- ✅ **Certificate Pinning**: OCSP stapling enabled

### **Additional Recommendations:**
- 🔄 **Monitor Certificate Expiry**: Set up alerts 30 days before expiry
- 🔄 **Regular Security Audits**: Test SSL configuration monthly
- 🔄 **Backup Certificates**: Keep secure backups of certificates
- 🔄 **Update Dependencies**: Keep nginx and OpenSSL updated

## 📱 **Application URLs**

### **Production URLs:**
- **Main Application**: https://dtps.tech
- **API Endpoints**: https://dtps.tech/api/*
- **Authentication**: https://dtps.tech/auth/*

### **Redirects:**
- **HTTP**: http://dtps.tech → https://dtps.tech
- **WWW**: http://www.dtps.tech → https://dtps.tech

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Certificate Not Found**
```bash
# Check if certificates exist
ls -la /etc/letsencrypt/live/dtps.tech/

# Re-obtain certificate if missing
sudo certbot certonly --standalone -d dtps.tech
```

#### **Permission Issues**
```bash
# Fix certificate permissions
sudo chmod 644 /etc/letsencrypt/live/dtps.tech/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/dtps.tech/privkey.pem
```

#### **Nginx SSL Errors**
```bash
# Check nginx configuration
docker-compose exec nginx nginx -t

# View nginx logs
docker-compose logs -f nginx

# Restart nginx
docker-compose restart nginx
```

## 📊 **Monitoring Commands**

### **Check SSL Status**
```bash
# Certificate expiry
openssl x509 -enddate -noout -in /etc/letsencrypt/live/dtps.tech/fullchain.pem

# SSL connection test
echo | openssl s_client -servername dtps.tech -connect dtps.tech:443

# Check renewal status
sudo certbot certificates
```

### **Application Health**
```bash
# Check containers
docker-compose ps

# View all logs
docker-compose logs -f

# Test application
curl -f https://dtps.tech/health
```

## 🎉 **Success Indicators**

When SSL is working correctly, you should see:
- ✅ **Green padlock** in browser address bar
- ✅ **HTTPS** in the URL
- ✅ **Valid certificate** when clicking the padlock
- ✅ **HTTP redirects** to HTTPS automatically
- ✅ **All features working** over HTTPS

## 🚀 **Next Steps**

1. **Deploy with SSL**: Run `sudo ./deploy-ssl.sh`
2. **Test thoroughly**: Check all application features over HTTPS
3. **Monitor certificate**: Set up expiry monitoring
4. **Update DNS**: Ensure all DNS records point to HTTPS
5. **Update links**: Change any hardcoded HTTP links to HTTPS

Your Zoconut application is now ready for secure HTTPS deployment! 🔒
