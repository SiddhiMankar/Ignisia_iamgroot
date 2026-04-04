import os
import cv2
import fitz  # PyMuPDF
import numpy as np

def deskew_image(image: np.ndarray) -> np.ndarray:
    """
    Detects the skew angle of the text and applies a rotation to correct it.
    """
    coords = np.column_stack(np.where(image > 0))
    if coords.shape[0] == 0:
        return image
        
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
        
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated

def preprocess_image(img_array: np.ndarray) -> np.ndarray:
    """
    Applies the shared stabilization pipeline to make image OCR-ready.
    Pipeline: Grayscale -> CLAHE -> Gaussian Blur -> Adaptive Thresh -> Deskew -> Morphology
    """
    if img_array is None or img_array.size == 0:
        return img_array

    # 1. Grayscale
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_array

    # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_contrast = clahe.apply(gray)

    # 3. Gaussian Blur (Denoising)
    blurred = cv2.GaussianBlur(enhanced_contrast, (5, 5), 0)

    # 4. Adaptive Thresholding (Handle shadows/gradients)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV,  # INVERT text to white on black for deskewing/morphology
        15, 5
    )

    # 5. Deskewing
    deskewed = deskew_image(thresh)

    # 6. Morphology Close (Close gaps inside letters)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    morph = cv2.morphologyEx(deskewed, cv2.MORPH_CLOSE, kernel)

    # Re-invert back to black-on-white text for OCR engines
    final_img = cv2.bitwise_not(morph)
    return final_img

def stabilize_document(file_path: str, debug_dir: str = "debug") -> list:
    """
    Opens a PDF (via PyMuPDF) or Image, processes each page through the stability pipeline,
    and returns a list of preprocessed numpy arrays.
    Also saves debug images to `debug_dir`.
    """
    if not os.path.exists(debug_dir):
        os.makedirs(debug_dir, exist_ok=True)
        
    ext = os.path.splitext(file_path)[1].lower()
    base_name = os.path.basename(file_path).rsplit('.', 1)[0]
    processed_pages = []

    if ext == '.pdf':
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=300)
            
            # Convert PyMuPDF pixmap to numpy array depending on channels
            if pix.n - pix.alpha < 4:
                # RGB / Grayscale
                img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
                if pix.alpha:
                    # Drop alpha channel
                    img_array = img_array[:, :, :3]
            else:
                # CMYK - rare but handle by converting to RGB
                pix = fitz.Pixmap(fitz.csRGB, pix)
                img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)

            # Convert RGB to BGR for OpenCV standard
            if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

            # Save debug original
            orig_path = os.path.join(debug_dir, f"{base_name}_page_{page_num}_original.png")
            cv2.imwrite(orig_path, img_array)

            preprocessed = preprocess_image(img_array)
            
            # Save debug preprocessed
            prep_path = os.path.join(debug_dir, f"{base_name}_page_{page_num}_preprocessed.png")
            cv2.imwrite(prep_path, preprocessed)

            processed_pages.append(preprocessed)
    else:
        # Standard image
        img_array = cv2.imread(file_path)
        if img_array is not None:
            orig_path = os.path.join(debug_dir, f"{base_name}_original.png")
            cv2.imwrite(orig_path, img_array)

            preprocessed = preprocess_image(img_array)
            
            prep_path = os.path.join(debug_dir, f"{base_name}_preprocessed.png")
            cv2.imwrite(prep_path, preprocessed)
            
            processed_pages.append(preprocessed)

    return processed_pages
