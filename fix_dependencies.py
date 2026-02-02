import subprocess
import sys

def install(packages):
    cmd = [sys.executable, "-m", "pip", "install"] + packages
    print(f"Running: {' '.join(cmd)}")
    subprocess.check_call(cmd)

def uninstall(packages):
    cmd = [sys.executable, "-m", "pip", "uninstall", "-y"] + packages
    print(f"Running: {' '.join(cmd)}")
    subprocess.check_call(cmd)

print("=== FIXING DEPENDENCIES FOR SPEECHCOACH ===\n")

# 1. Uninstall critical conflicting packages
print("1. Uninstalling conflicting packages...")
try:
    uninstall(["mediapipe", "numpy", "protobuf", "opencv-python", "opencv-contrib-python", "opencv-python-headless"])
except Exception as e:
    print(f"Warning during uninstall: {e}")

# 2. Install stable versions (Numpy 1.x, Protobuf 3.20+, MediaPipe)
print("\n2. Installing stable compatible versions...")
# NumPy < 2 is crucial for binary compatibility with current wheels
# Protobuf often causes issues, 3.20.x or 4.23.x is usually safe. MediaPipe pulls what it needs.
try:
    install([
        "numpy<2.0.0", 
        "protobuf==3.20.3", 
        "opencv-contrib-python", 
        "mediapipe==0.10.11"
    ])
except Exception as e:
    print(f"Error installing core packages: {e}")
    sys.exit(1)

# 3. Verify
print("\n3. Verifying MediaPipe installation...")
try:
    import mediapipe as mp
    print(f"SUCCESS: MediaPipe found at {mp.__file__}")
    import mediapipe.python.solutions as solutions
    print("SUCCESS: mediapipe.solutions is accessible.")
except ImportError as e:
    print(f"FAILURE: Could not import mediapipe: {e}")
except AttributeError as e:
    print(f"FAILURE: Attribute error: {e}")

print("\n=== DONE. You can now try running process_video.py ===")
