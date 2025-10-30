#!/usr/bin/env python3
"""
Fix .env file with correct encryption key
"""

from cryptography.fernet import Fernet

# Generate a new encryption key
encryption_key = Fernet.generate_key().decode()

# Read the current .env file
with open('env.example', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the encryption key
content = content.replace('your-32-char-encryption-key-here-must-be-32-chars', encryption_key)

# Write the fixed .env file
with open('.env', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed .env file with encryption key: {encryption_key}")
print("You can now run: python run_simple.py")
