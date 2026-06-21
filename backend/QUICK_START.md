# 🚀 M3ALEM Backend - Quick Start Guide

## ⚡ 30-Second Setup

```powershell
# 1. Activate environment
cd c:\Users\pc\M3ALEM_BACKEND
.\venv\Scripts\Activate.ps1

# 2. Start Redis (in separate terminal)
docker run -p 6379:6379 redis

# 3. Run server
python manage.py runserver 0.0.0.0:8000# OR with WebSocket support:
# daphne -b 0.0.0.0 -p 8000 m3alem_backend.asgi:application

# 4. Open http://10.89.108.137:8000/api/
```

## 🧪 Quick Test

```powershell
# Health check
python test_setup.py

# Run Django checks
python manage.py check
```

## 📱 API Quick Reference

| Action | Endpoint | Method |
|--------|----------|--------|
| Register | `/api/accounts/register/` | POST |
| Login | `/api/login/` | POST |
| Create Request | `/api/requests/` | POST |
| Create Offer | `/api/requests/offers/` | POST |
| Accept Offer | `/api/requests/offers/{id}/respond/` | POST |
| Pay | `/api/payments/` | POST |
| Review | `/api/reviews/` | POST |
| Test ML | `/api/fraud/review-fake-check/` | POST |
| Chat | `WS /ws/chat/{room_id}/?token=JWT` | WS |

## 🔑 Getting Auth Token

```bash
# 1. Register
curl -X POST http://10.89.108.137:8000/api/accounts/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Pass123!","role":"CLIENT","phone":"0601020304","profile":{"address":"Paris","latitude":48.8566,"longitude":2.3522}}'

# 2. Login
curl -X POST http://10.89.108.137:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Pass123!"}'

# 3. Copy "access" token and use:
curl http://10.89.108.137:8000/api/reviews/ \
  -H "Authorization: Bearer {TOKEN_HERE}"
```

## 📊 Database Access

```bash
# MySQL shell
mysql -h 10.89.108.137 -u root -p123456789Ouaqa m3alem_db

# Django shell
python manage.py shell
>>> from reviews.models import Review
>>> Review.objects.all()
>>> from accounts.models import User
>>> User.objects.all()
```

## 🤖 ML Model Testing

```python
# In Django shell
from fraud.services import detect_fake_review

# Test cases
is_fake, score, level = detect_fake_review("Terrible service")
print(f"Score: {score}, Level: {level}")

is_fake, score, level = detect_fake_review("AMAZING!!! INCREDIBLE!!!")
print(f"Score: {score}, Level: {level}")
```

## 📝 Important Files

```
README.md                    ← Full documentation
DIAGNOSTIC_COMPLET.md       ← Error analysis + fixes
ERRORS_LOG_DETAILED.md      ← Error details
M3ALEM_Postman_Collection.json  ← 20+ test endpoints
test_setup.py               ← Health check
```

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| MySQL not running | `net start MySQL80` |
| Redis not running | `docker run -p 6379:6379 redis` |
| Port 8000 in use | `python manage.py runserver 0.0.0.0:80008001` |
| No access token | Run login endpoint first |
| WebSocket 403 | Check JWT token validity |
| Review review null fields | Run signal test: `from reviews.signals import analyze_review` |

## 🔍 Debug Checklist

```bash
# 1. Check Django
python manage.py check

# 2. Check database
python manage.py dbshell

# 3. Check migrations
python manage.py showmigrations

# 4. Check imports
python test_setup.py

# 5. Check ML
python manage.py shell
from fraud.services import detect_fake_review
detect_fake_review("test")

# 6. Check WebSocket (in browser console)
ws = new WebSocket("ws://10.89.108.137:8000/ws/chat/room-id/?token=JWT")
ws.onmessage = m => console.log(m.data)
```

## 📦 Available Endpoints

**Auth**: register, login, token/refresh  
**Requests**: list, create, get matching  
**Offers**: create, respond (accept/reject)  
**Payments**: create, list  
**Reviews**: create, list, detail  
**Chat**: rooms list, messages list, messages create, WebSocket  
**Fraud**: review-fake-check (ML prediction)  
**Admin**: /admin/ (Django admin)

## 🎯 Next Steps

1. **Import Postman collection** for guided testing
2. **Run full workflow**: Register → Request → Offer → Accept → Pay → Review
3. **Test ML model** with various review texts
4. **Test WebSocket** chat with two users
5. **Check database** to see created records
6. **Review logs** for any errors

## 💾 Database Reset

```bash
# WARNING: Deletes all data!
python manage.py flush
python manage.py migrate
```

## 🚀 Deployment

```bash
# Generate SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Settings for production (edit settings.py):
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com']
SECRET_KEY = 'your-generated-key'
DATABASES = {...production...}
CHANNEL_LAYERS = {...production redis...}

# Run with Daphne
daphne -b 0.0.0.0 -p 8000 m3alem_backend.asgi:application
```

## 🆘 Getting Help

1. Check **README.md** for full guide
2. Check **DIAGNOSTIC_COMPLET.md** for error reference
3. Run **test_setup.py** for system status
4. Check **Django logs** in terminal
5. Check **MySQL error log**: `tail -n 50 /var/log/mysql/error.log`

---

**Last Updated**: 2026-06-04  
**Version**: 1.0  
**Status**: ✅ Production Ready
