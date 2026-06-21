#!/usr/bin/env python
"""
Quick test to verify the Django setup is working correctly.
Run: python test_setup.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'm3alem_backend.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

def test_imports():
    """Test all critical imports."""
    print("Testing imports...")
    try:
        from accounts.models import User
        print("✅ accounts.models")
        
        from requests_app.models import Request, Offer
        print("✅ requests_app.models")
        
        from payments.models import Payment
        print("✅ payments.models")
        
        from reviews.models import Review
        print("✅ reviews.models")
        
        from fraud.models import FraudAlert
        print("✅ fraud.models")
        
        from chat.models import ChatRoom, Message
        print("✅ chat.models")
        
        from matching.services import find_nearby_artisans
        print("✅ matching.models")
        
        from fraud.services import detect_fake_review
        print("✅ fraud.services")
        
        from fraud.views import ReviewFakePredictionView
        print("✅ fraud.views")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_ml_model():
    """Test ML model loading and inference."""
    print("\nTesting ML model...")
    try:
        from fraud.services import detect_fake_review
        
        # Test with positive comment
        is_fake, score, level = detect_fake_review("This service was terrible")
        print(f"✅ Negative comment: is_fake={is_fake}, score={score:.2f}, level={level}")
        
        # Test with suspicious comment
        is_fake, score, level = detect_fake_review("AMAZING!!! INCREDIBLE!!! BEST!!! 100/10!!!")
        print(f"✅ Suspicious comment: is_fake={is_fake}, score={score:.2f}, level={level}")
        
        return True
    except Exception as e:
        print(f"❌ ML model failed: {e}")
        return False

def test_signals():
    """Test signal registration."""
    print("\nTesting signals...")
    try:
        from reviews.signals import analyze_review
        print("✅ reviews.signals registered")
        return True
    except Exception as e:
        print(f"❌ Signal registration failed: {e}")
        return False

def test_permissions():
    """Test permission classes."""
    print("\nTesting permissions...")
    try:
        from accounts.permissions import IsClient, IsArtisan, IsAdmin
        print("✅ IsClient, IsArtisan, IsAdmin")
        
        from requests_app.permissions import RequestAccessPermission
        print("✅ RequestAccessPermission")
        
        return True
    except Exception as e:
        print(f"❌ Permission classes failed: {e}")
        return False

def test_database():
    """Test database connection."""
    print("\nTesting database...")
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def main():
    print("=" * 60)
    print("M3ALEM Backend Setup Verification")
    print("=" * 60)
    
    results = []
    results.append(("Imports", test_imports()))
    results.append(("Database", test_database()))
    results.append(("ML Model", test_ml_model()))
    results.append(("Signals", test_signals()))
    results.append(("Permissions", test_permissions()))
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    all_pass = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:.<20} {status}")
        all_pass = all_pass and passed
    
    print("=" * 60)
    if all_pass:
        print("🎉 ALL TESTS PASSED - System ready!")
        return 0
    else:
        print("⚠️  Some tests failed - check output above")
        return 1

if __name__ == "__main__":
    sys.exit(main())
