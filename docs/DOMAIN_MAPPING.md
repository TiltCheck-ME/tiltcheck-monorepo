# TiltCheck.it.com Domain Mapping

## 🌐 **Public URLs**

### **Main Site**
- **Homepage**: `https://tiltcheck.it.com`
  - Landing page with casino directory
  - Trust score overview
  - Quick access to all tools

### **Analytics & Dashboards**
- **Trust Dashboard**: `https://tiltcheck.it.com/dashboard/`
  - Real-time casino trust metrics
  - Risk alerts and monitoring
  - Historical trust score trends

### **Gameplay Analysis Tools**
- **Gameplay Analyzer**: `https://tiltcheck.it.com/analyzer/`
  - CSV upload for casino data analysis
  - Session tracking and pattern detection
  - Manual gameplay analysis tools

- **Enhanced Analyzer**: `https://tiltcheck.it.com/enhanced/`
  - Advanced pattern detection
  - Real-time WebSocket analysis
  - Automated tilt detection

- **Screen Analyzer**: `https://tiltcheck.it.com/screen/`
  - OCR-based gameplay detection
  - Visual pattern recognition
  - Screenshot analysis tools

### **API Endpoints**
- **Dashboard API**: `https://tiltcheck.it.com/api/`
  - Trust metrics API
  - Real-time data feeds
  - Alert management

- **Trust Engine**: `https://tiltcheck.it.com/trust-api/`
  - Casino trust calculations
  - Fairness metrics
  - Historical data access

### **System Health**
- **Proxy Health**: `https://tiltcheck.it.com/proxy-health`
  - Nginx status check
  - SSL verification
  - Service availability

## 🔧 **Local Development Mapping**

When developing locally, these services map to:

| Public URL | Local Development | Service |
|------------|------------------|---------|
| `tiltcheck.it.com` | `localhost:8080` | Landing |
| `tiltcheck.it.com/dashboard/` | `localhost:5055` | Trust Dashboard |
| `tiltcheck.it.com/analyzer/` | `localhost:7072` | Gameplay Analyzer |
| `tiltcheck.it.com/enhanced/` | `localhost:7074` | Enhanced Analyzer |
| `tiltcheck.it.com/screen/` | `localhost:7073` | Screen Analyzer |
| `tiltcheck.it.com/trust-api/` | `localhost:8082` | Trust Rollup |

## 🚀 **Deployment Requirements**

### **DNS Configuration**
```
A Record: tiltcheck.it.com → [SERVER_IP]
CNAME: www.tiltcheck.it.com → tiltcheck.it.com
```

### **SSL Certificate**
- Use Let's Encrypt for free SSL
- Automatic renewal via certbot
- Covers both `tiltcheck.it.com` and `www.tiltcheck.it.com`

### **Docker Services Required**
- `landing:8080`
- `dashboard:5055`  
- `gameplay-analyzer:7072`
- `enhanced-analyzer:7074`
- `screen-analyzer:7073`
- `trust-rollup:8082`
- `nginx:80,443` (reverse proxy)

## 🔐 **Security Features**

- **Rate Limiting**: 30 requests/minute per IP
- **SSL/TLS**: TLS 1.2+ only
- **Headers**: Security headers enabled
- **Gzip**: Compression for better performance
- **Caching**: Static assets cached for 1 hour

## 📱 **User Experience**

### **Navigation Flow**
1. **Home** (`/`) → Casino directory, quick start
2. **Dashboard** (`/dashboard/`) → Live trust metrics
3. **Analyzer** (`/analyzer/`) → Upload casino data
4. **Enhanced** (`/enhanced/`) → Real-time monitoring
5. **Screen** (`/screen/`) → Visual analysis tools

### **API Integration**
- All dashboards use `/api/` endpoints
- Real-time updates via WebSocket
- Trust data from `/trust-api/`
- Cross-service communication via Event Router

## 🎯 **Discord Integration**

Discord bot commands now reference public URLs:
- `/play` command links to casinos
- `/collectclock` shows metrics from public dashboard
- Analysis results viewable at public analyzer URLs

## 📊 **Monitoring & Analytics**

- **Health Checks**: `/proxy-health` endpoint
- **Access Logs**: JSON structured logging
- **Error Tracking**: Nginx error logs
- **Performance**: Request timing and caching metrics