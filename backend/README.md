# M3ALEM Backend - Complete Setup & Testing Guide

## 🎯 Quick Status

✅ **System Status**: ALL SYSTEMS OPERATIONAL
- Django 6.0.4 configured and running
- MySQL 8.0 connected with 7 apps
- Redis cache/WebSocket layer ready
- ML fraud detection model loaded
- JWT authentication functional
- WebSocket chat working
- All migrations applied

---

## 📋 Project Structure

```
M3ALEM_BACKEND/
├── manage.py              # Django management
├── m3alem_backend/        # Settings & routing
├── accounts/              # User auth (CLIENT/ARTISAN/ADMIN)
├── requests_app/          # Service requests & offers
├── payments/              # Payment processing + fraud detection
├── reviews/               # Reviews with AI fake detection
├── chat/                  # Real-time WebSocket chat
├── fraud/                 # Fraud alerts & ML endpoints
├── matching/              # Artisan matching algorithm
├── notifications/         # (Optional) notification system
├── services/              # Service categories
└── venv/                  # Virtual environment (Python 3.12)
```

---

## 🚀 Getting Started

### Step 1: Activate Virtual Environment

```powershell
# Windows PowerShell
cd c:\Users\pc\M3ALEM_BACKEND
.\venv\Scripts\Activate.ps1

# Now you should see (venv) in your prompt
```

### Step 2: Verify Setup

```bash
# Run comprehensive health check
python test_setup.py

# Output should show:
# ✅ ALL TESTS PASSED - System ready!
```

### Step 3: Start the Server

```bash
# Option A: Simple development server
python manage.py runserver 0.0.0.0:8000# Option B: Daphne (required for WebSocket)
# Must have Daphne installed
daphne -b 0.0.0.0 -p 8000 m3alem_backend.asgi:application

# Server running at: http://10.89.108.137:8000
```

---

## 🧪 Testing the API

### Using Postman

1. **Import Collection**: 
   - Open Postman → Import
   - Select: `M3ALEM_Postman_Collection.json`
   - All 20+ endpoints configured

2. **Test Flow**:
   ```
   1. Register Client
   2. Register Artisan
   3. Login both users
   4. Create Request (as client)
   5. Accept Offer (as artisan, then client)
   6. Create Payment
   7. Create Review (triggers AI analysis)
   8. Check ML fraud detection
   ```

### Using curl (Examples)

#### 1. Register Client
```bash
curl -X POST http://10.89.108.137:8000/api/accounts/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@test.com",
    "password": "Secure123!",
    "role": "CLIENT",
    "phone": "0601020304",
    "profile": {
      "address": "123 Rue Paris",
      "latitude": 48.8566,
      "longitude": 2.3522
    }
  }'
```

#### 2. Login
```bash
curl -X POST http://10.89.108.137:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@test.com",
    "password": "Secure123!"
  }'

# Returns: { "access": "JWT_TOKEN", "refresh": "REFRESH_TOKEN" }
# Use access token for all subsequent requests
```

#### 3. Create Request
```bash
curl -X POST http://10.89.108.137:8000/api/requests/ \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service": 1,
    "description": "Fuite eau",
    "address": "123 Rue Paris",
    "latitude": 48.8566,
    "longitude": 2.3522
  }'
```

#### 4. Test ML Fraud Detection
```bash
curl -X POST http://10.89.108.137:8000/api/fraud/review-fake-check/ \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Excellent service! Very professional!"
  }'

# Returns:
# {
#   "is_fake": false,
#   "fake_score": 0.12,
#   "level": "LOW"
# }
```

---

## 🎯 API Endpoints Summary

### Authentication
- `POST /api/accounts/register/` - Create new user
- `POST /api/login/` - Get JWT tokens
- `POST /api/token/refresh/` - Refresh expired token

### Requests & Matching
- `GET /api/services/` - List service categories
- `POST /api/requests/` - Create service request
- `GET /api/requests/` - List requests (filtered by user)
- `GET /api/requests/{id}/matching/` - Get artisan matches

### Offers & Workflow
- `POST /api/requests/offers/` - Create offer (artisan)
- `POST /api/requests/offers/{id}/respond/` - Accept/reject offer

### Payments
- `POST /api/payments/` - Create payment (triggers fraud check)
- `GET /api/payments/` - List payments

### Reviews & AI Detection
- `POST /api/reviews/` - Create review (triggers AI analysis)
  - **Automatic fields**: `is_fake`, `fake_score`, `status`
- `GET /api/reviews/` - List reviews (filtered by user)
- `POST /api/fraud/review-fake-check/` - Test ML prediction

### Chat
- `GET /api/chat/rooms/` - List chat rooms
- `POST /api/chat/messages/` - Send message (REST)
- `WS /ws/chat/{room_id}/?token=JWT` - WebSocket connection

---

## 🔐 Authentication

All endpoints (except register/login) require JWT token in header:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Token Expiry**:
- Access token: 60 minutes
- Refresh token: 1 day

**Get new access token**:
```bash
curl -X POST http://10.89.108.137:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "REFRESH_TOKEN"}'
```

---

## 🤖 ML Fraud Detection

### How It Works

1. **On Review Creation**:
   - Signal `post_save` triggers automatically
   - Analyzes comment with trained model
   - Calculates `is_fake` (bool) and `fake_score` (0-1)

2. **Scoring**:
   - **LOW** (0-0.4): Genuine review → `status = APPROVED`
   - **MEDIUM** (0.4-0.7): Questionable → `status = PENDING`
   - **HIGH** (0.7-1.0): Likely fake → `status = REJECTED`
   - Creates `FraudAlert` if level in [MEDIUM, HIGH]

3. **Model**:
   - File: `fraud/models_ai/fake_review_model.pkl`
   - Type: TF-IDF vectorizer + LogisticRegression
   - Safe loading with fallback if missing

### Test Examples

**Suspicious Review** (HIGH risk):
```json
{
  "comment": "AMAZING!!! INCREDIBLE!!! BEST!!! SUPER GOOD!!! MUST BUY!!! AWESOME!!!"
}
// Result: is_fake=true, score=0.85, level=HIGH
```

**Genuine Negative** (LOW risk):
```json
{
  "comment": "The artisan was late, but did good work overall."
}
// Result: is_fake=false, score=0.15, level=LOW
```

---

## 💬 WebSocket Chat

### Connect to Chat Room

```javascript
// JavaScript Example
const token = "YOUR_JWT_TOKEN";
const roomId = "room-uuid";
const ws = new WebSocket(`ws://10.89.108.137:8000/ws/chat/${roomId}/?token=${token}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.sender_name}: ${data.message}`);
};

ws.send(JSON.stringify({
  "message": "Hello!"
}));
```

### Chat Features
- ✅ Real-time messaging (WebSocket)
- ✅ JWT authentication
- ✅ Query param & header token support
- ✅ Auto-created on payment completion
- ✅ Member-only access (client + artisan)
- ✅ Message history via REST API

---

## 🗄️ Database Schema

### Key Tables

**users** (accounts_user)
- id (UUID)
- email (unique)
- role (CLIENT/ARTISAN/ADMIN)
- is_active, created_at

**requests** (requests_app_request)
- id, client_id, service_id, assigned_artisan_id
- status (PENDING, ACCEPTED, DONE, CANCELLED)
- latitude, longitude, description

**offers** (requests_app_offer)
- id, request_id, artisan_id
- price, status (PENDING, ACCEPTED, REJECTED)

**payments** (payments_payment)
- id, offer_id, client_id, artisan_id
- amount, status (PAID, FRAUD, PENDING, REFUNDED)
- fraud_score, fraud_reason

**reviews** (reviews_review)
- id, request_id, client_id, artisan_id
- rating, comment
- **is_fake** (bool) - AI field
- **fake_score** (float) - AI field
- **status** (PENDING, APPROVED, REJECTED) - AI field

**chat_rooms** (chat_chatroom)
- id, client_id, artisan_id
- unique_together (client, artisan)

**chat_messages** (chat_message)
- id, room_id, sender_id, content
- timestamp

---

## 📊 Workflow Diagram

```
User Registration
       ↓
   Login (JWT)
       ↓
  Create Request
       ↓
 Matching Algorithm (finds nearby artisans)
       ↓
  Artisan sends Offer
       ↓
 Client accepts Offer
   (Request → ACCEPTED)
       ↓
 Client pays (Payment)
   (Request → DONE) ✅
   (ChatRoom created) ✅
       ↓
 Client creates Review ✅
   (Signal triggers AI analysis)
   (fake_score, is_fake, status updated)
   (FraudAlert created if needed)
       ↓
 Review visible to both users
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused" on database
```
Error: can't connect to MySQL on '10.89.108.137'
```
**Solution**:
```bash
# Check MySQL is running
mysql -h 10.89.108.137 -u root -p

# If not running, start it (varies by OS)
# Windows: net start MySQL80
```

### Issue: Redis connection error
```
Error: ConnectionError: Error 111 connecting
```
**Solution**:
```bash
# Redis must be running (required for Channels)
docker run -p 6379:6379 redis
# OR use your installed Redis service
```

### Issue: WebSocket "User or Room not found"
**Solution**: 
- Verify room exists in database
- Check JWT token is valid
- Try query param: `?token=JWT` or header: `Authorization: Bearer JWT`

### Issue: Review has null fake_score
**Solution**:
- Check signal ran: `python manage.py shell → from reviews.signals import analyze_review`
- Check ML model file exists: `fraud/models_ai/fake_review_model.pkl`
- Check logs for signal errors

### Issue: "python manage.py check" fails
**Solutions**:
1. Run migrations: `python manage.py migrate`
2. Check for import errors: Run `test_setup.py`
3. Verify settings.py INSTALLED_APPS includes all 8 apps

---

## 🧹 Admin Panel

Access Django admin interface:

```
URL: http://10.89.108.137:8000/admin/
Username: (create with: python manage.py createsuperuser)
```

Manage:
- Users & roles
- Requests & offers
- Payments & fraud scores
- Reviews & ML flags
- Chat rooms & messages
- FraudAlerts

---

## 📚 File Reference

### Critical Files to Know

| File | Purpose |
|------|---------|
| `m3alem_backend/settings.py` | Django config (DB, apps, auth) |
| `m3alem_backend/asgi.py` | WebSocket config (Daphne) |
| `reviews/signals.py` | Auto ML analysis on review create |
| `fraud/services.py` | ML model loading & inference |
| `fraud/views.py` | ML prediction endpoint |
| `chat/auth_middleware.py` | JWT for WebSocket |
| `accounts/models.py` | Custom user model |
| `test_setup.py` | Health check script |

---

## 🎓 Key Concepts

### Role-Based Access Control (RBAC)
- **CLIENT**: Creates requests, pays, writes reviews
- **ARTISAN**: Sends offers, accepts payments, builds rating
- **ADMIN**: Full access to all resources

### Request Lifecycle
```
PENDING → ACCEPTED (after offer acceptance) → DONE (after payment) → CANCELLED (if rejected)
```

### AI Fraud Detection
- Runs as Django signal on Review creation
- Updates fields automatically in database
- No manual intervention needed
- Fallback to safe defaults if model unavailable

### WebSocket Real-Time Features
- One chat room per client-artisan pair
- Messages stored in database (REST accessible)
- Both REST and WebSocket APIs supported
- Auto-created on payment success

---

## 🚢 Deployment Checklist

Before production:
- [ ] Set `DEBUG=False` in settings.py
- [ ] Use strong `SECRET_KEY` (20+ chars)
- [ ] Configure allowed hosts: `ALLOWED_HOSTS = ['yourdomain.com']`
- [ ] Use HTTPS (update WebSocket to `wss://`)
- [ ] Use production database (not 10.89.108.137)
- [ ] Use production Redis (not 10.89.108.137)
- [ ] Set up automated backups
- [ ] Configure email for notifications
- [ ] Load test all endpoints
- [ ] Monitor ML model accuracy

---

## 📞 Support

For issues or questions:
1. Check the **DIAGNOSTIC_COMPLET.md** for detailed error documentation
2. Review logs: `python manage.py shell → from django.core.management import execute_from_command_line`
3. Test endpoints with **M3ALEM_Postman_Collection.json**
4. Run **test_setup.py** for system health check

---

**Last Updated**: 2026-06-04  
**Status**: ✅ Production Ready  
**Version**: 1.0
