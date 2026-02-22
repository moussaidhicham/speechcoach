import cv2
import numpy as np

print(f"OpenCV Version: {cv2.__version__}")

# Create a random 3x3 rotation matrix
rmat = np.eye(3)

print("Calling cv2.RQDecomp3x3(rmat)...")
ret = cv2.RQDecomp3x3(rmat)

print(f"Type of return: {type(ret)}")
print(f"Length of return: {len(ret)}")
print(f"Values: {ret}")

if len(ret) == 6:
    print("Detected 6 values. Likely: (mtxR, mtxQ, Qx, Qy, Qz) OR (angles, mtxR, mtxQ, Qx, Qy, Qz)?")
elif len(ret) == 7:
    print("Detected 7 values.")
