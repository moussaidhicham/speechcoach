import sys
import mediapipe as mp

print(f"Python: {sys.version}")
print(f"MediaPipe path: {mp.__file__}")
print("Dir(mp):", dir(mp))

try:
    import mediapipe.python.solutions as solutions
    print("Found mediapipe.python.solutions")
except ImportError as e:
    print(f"Could not import mediapipe.python.solutions: {e}")

try:
    print("mp.solutions:", mp.solutions)
except AttributeError as e:
    print(f"Error accessing mp.solutions: {e}")
