"""
document_parser/handwriting_preprocess.py
-----------------------------------------
A lightweight module using OpenCV to enhance scanned handwritten documents before OCR. 

Features:
- Grayscale conversion
- Fast Non-Local Means / Gaussian Denoising
- Adaptive Thresholding to make ink pop against varied paper backgrounds
- Supports both cv2 numpy arrays and file paths
"""

import cv2
import numpy as np
from utils.logger import get_logger

logger = get_logger(__name__)

def preprocess_image_array(img_array: np.ndarray) -> np.ndarray:
    """
    Enhances an RGB/BGR numpy image array for handwritten OCR.
    Args:
        img_array: numpy array representing the image.
    Returns:
        A thresholded binary numpy array.
    """
    if img_array is None or img_array.size == 0:
        return img_array

    try:
        # Convert to grayscale if it's 3-channel
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_array
            
        # Denoising: Remove graininess which causes OCR fragmentation
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Adaptive Thresholding: 
        # Handles shadows/gradients where the edge of a paper is darker than the center
        thresh = cv2.adaptiveThreshold(
            blurred, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            15, 5 # Larger block size helps connected handwritten strokes
        )
        
        return thresh
    except Exception as e:
        logger.warning(f"Image preprocessing failed, falling back to original: {e}")
        return img_array

def preprocess_handwriting(image_path: str, output_path: str = None) -> str:
    """
    Legacy wrapper for file-based processing.
    """
    img = cv2.imread(image_path)
    if img is None:
        logger.warning(f"Could not read image: {image_path}")
        return image_path
        
    processed_img = preprocess_image_array(img)
    
    if not output_path:
        output_path = image_path.rsplit('.', 1)[0] + "_enhanced.jpg"
        
    cv2.imwrite(output_path, processed_img)
    return output_path
