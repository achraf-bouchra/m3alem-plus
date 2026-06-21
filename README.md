# M3ALEM+

## Smart Geolocated Service Marketplace

M3ALEM+ is an intelligent service marketplace that connects clients with nearby artisans using geolocation, real-time communication, and AI-assisted fraud detection.

The platform allows clients to request services, receive offers from artisans, communicate through real-time chat, complete payments, and submit reviews after service completion.

---

## Main Features

### Client Features

- User registration and authentication
- Geolocated service requests
- Nearby artisan matching
- Offer comparison and selection
- Real-time messaging
- Payment management
- Service reviews and ratings
- Notifications

### Artisan Features

- Professional profile management
- Availability toggle
- Receive nearby requests
- Submit offers
- Real-time communication
- Bank account information
- Reputation and rating system

### Platform Features

- Intelligent artisan matching
- Fraudulent review detection
- Payment workflow management
- Analytics and monitoring
- Notification system

---

## System Architecture

The platform follows a client-server architecture.

### Frontend

- React Native
- Expo Router
- AsyncStorage
- WebSocket Client

### Backend

- Django
- Django REST Framework
- Django Channels
- JWT Authentication
- MySQL

### AI Module

- Scikit-Learn
- Isolation Forest
- Review Fraud Detection

---

## Matching Algorithm

Artisans are filtered using:

- Service category
- Availability status
- GPS coordinates
- Distance radius

Ranking formula:

score = distance_km + (5 - rating)

Lower scores receive higher priority.

---

## Payment Workflow

1. Client submits request
2. Artisan sends offer
3. Client accepts offer
4. Client pays
5. Service is completed
6. Review is submitted

---

## Real-Time Communication

The platform uses:

- Django Channels
- WebSockets

Features:

- Instant messaging
- Request notifications
- Offer notifications
- Service status updates

---

## Fraud Detection

The system analyzes reviews using machine learning techniques.

Functions:

- Fake review detection
- Fraud scoring
- Review moderation support
- Behavioral anomaly analysis

Dataset:

https://www.kaggle.com/datasets/mexwell/fake-reviews-dataset

---

## Project Structure

```
m3alem-plus/
│
├── article/
│   └── M3ALEM+_SoftwareX.pdf
│
├── backend/
│   ├── accounts/
│   ├── matching/
│   ├── chat/
│   ├── fraud/
│   └── media/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   └── assets/
│
└── README.md
```

---

## Installation

### Backend

```bash
cd backend

python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

python manage.py migrate

python manage.py runserver
```

### Frontend

```bash
cd frontend

npm install

npx expo start
```

---

## Technologies

- Django
- Django REST Framework
- Django Channels
- React Native
- Expo
- MySQL
- JWT
- WebSockets
- Scikit-Learn
- Docker

---

## Authors

- Achraf
- Bouchra

---

## License

MIT License

---

## SoftwareX Article

The SoftwareX manuscript is available in:

```
article/M3ALEM+_SoftwareX.pdf
```
