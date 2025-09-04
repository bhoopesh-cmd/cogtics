#!/usr/bin/env python3
"""
Test script for Firestore integration
Run this script to test if Firestore is properly configured and working
"""

import os
import sys

def test_imports():
    """Test if required packages can be imported"""
    print("Testing imports...")
    
    try:
        import streamlit as st
        print("✓ streamlit imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import streamlit: {e}")
        return False
    
    try:
        import firebase_admin
        print("✓ firebase-admin imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import firebase-admin: {e}")
        return False
    
    try:
        from firebase_admin import credentials, firestore
        print("✓ firebase_admin.credentials and firestore imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import firebase_admin components: {e}")
        return False
    
    try:
        import pyrebase
        print("✓ pyrebase imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import pyrebase: {e}")
        return False
    
    return True

def test_configuration():
    """Test if Firebase configuration is available"""
    print("\nTesting configuration...")
    
    try:
        from firebase_config import get_firebase_config, get_service_account_config, is_firebase_configured
        
        config = get_firebase_config()
        print(f"✓ Firebase config loaded: {config.get('projectId', 'No project ID')}")
        
        service_account = get_service_account_config()
        if service_account:
            print(f"✓ Service account config loaded: {service_account.get('project_id', 'No project ID')}")
        else:
            print("⚠ Service account config not found")
        
        is_configured = is_firebase_configured()
        print(f"✓ Firebase configured: {is_configured}")
        
        return is_configured
        
    except Exception as e:
        print(f"✗ Failed to test configuration: {e}")
        return False

def test_firestore_connection():
    """Test if Firestore connection works"""
    print("\nTesting Firestore connection...")
    
    try:
        from firestore_service import init_firestore
        
        db = init_firestore()
        if db:
            print("✓ Firestore connection established")
            
            # Test a simple read operation
            try:
                # Try to read from a test collection
                test_ref = db.collection("test_connection")
                docs = test_ref.limit(1).stream()
                list(docs)  # This should not fail even if collection is empty
                print("✓ Firestore read operation successful")
                return True
            except Exception as e:
                print(f"⚠ Firestore read test failed: {e}")
                return False
        else:
            print("✗ Failed to establish Firestore connection")
            return False
            
    except Exception as e:
        print(f"✗ Failed to test Firestore connection: {e}")
        return False

def test_auth_connection():
    """Test if Firebase Auth connection works"""
    print("\nTesting Firebase Auth connection...")
    
    try:
        import pyrebase
        from firebase_config import get_firebase_config
        
        config = get_firebase_config()
        firebase = pyrebase.initialize_app(config)
        auth = firebase.auth()
        
        print("✓ Firebase Auth initialized successfully")
        return True
        
    except Exception as e:
        print(f"✗ Failed to test Firebase Auth: {e}")
        return False

def main():
    """Run all tests"""
    print("Firestore Integration Test")
    print("=" * 40)
    
    # Test 1: Imports
    if not test_imports():
        print("\n❌ Import test failed. Please install required packages:")
        print("pip install firebase-admin pyrebase4 streamlit")
        return False
    
    # Test 2: Configuration
    if not test_configuration():
        print("\n❌ Configuration test failed. Please check your Firebase setup.")
        print("See FIRESTORE_SETUP.md for setup instructions.")
        return False
    
    # Test 3: Firestore connection
    if not test_firestore_connection():
        print("\n❌ Firestore connection test failed.")
        print("Please check your service account credentials and Firestore setup.")
        return False
    
    # Test 4: Auth connection
    if not test_auth_connection():
        print("\n❌ Firebase Auth test failed.")
        print("Please check your Firebase configuration.")
        return False
    
    print("\n✅ All tests passed! Firestore integration is working correctly.")
    print("\nYou can now run the main application:")
    print("streamlit run app.py")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 