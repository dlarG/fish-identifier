# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import numpy as np
import base64
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'avif'}
MAX_FILE_SIZE = 16 * 1024 * 1024 

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class FishClassifier(nn.Module):
    def __init__(self, num_classes=75):
        super(FishClassifier, self).__init__()
        self.backbone = models.resnet50(pretrained=False)
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)

# Load model and class mappings
def load_model():
    """Load the trained model"""
    try:
        checkpoint_path = 'best_fish_model_enhanced.pth'  
        
        if not os.path.exists(checkpoint_path):
            possible_paths = [
                'models/best_fish_model_enhanced.pth',
                '../models/best_fish_model_enhanced.pth',
                'best_fish_model_enhanced.pth'
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    checkpoint_path = path
                    break
        
        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(f"Model file not found at {checkpoint_path}")
        
        checkpoint = torch.load(checkpoint_path, map_location=torch.device('cpu'))
        
        # Initialize model
        model = FishClassifier(num_classes=len(checkpoint['class_to_idx']))
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        
        # Get class mappings
        idx_to_class = checkpoint['idx_to_class']
        
        print(f"Model loaded successfully from {checkpoint_path}")
        print(f"Number of classes: {len(idx_to_class)}")
        
        return model, idx_to_class
        
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return None, None

model, idx_to_class = load_model()

transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_bytes):
    """Preprocess image for model inference"""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        image_tensor = transform(image).unsqueeze(0)  # Add batch dimension
        
        return image_tensor, image
    except Exception as e:
        raise Exception(f"Error preprocessing image: {str(e)}")

def predict_fish(image_bytes):
    """Predict fish species from image bytes"""
    if model is None:
        raise Exception("Model not loaded")
    
    try:
        image_tensor, original_image = preprocess_image(image_bytes)
        
        with torch.no_grad():
            outputs = model(image_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
        
        top_probs, top_indices = torch.topk(probabilities, 3, dim=1)
    
        top_probs = top_probs[0].numpy()
        top_indices = top_indices[0].numpy()
        
        predictions = []
        for prob, idx in zip(top_probs, top_indices):
            predictions.append({
                'species': idx_to_class.get(idx, f"Class_{idx}"),
                'confidence': float(prob * 100),  # Convert to percentage
                'class_id': int(idx)
            })
        
        return predictions, original_image
        
    except Exception as e:
        raise Exception(f"Prediction error: {str(e)}")

def image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/jpeg;base64,{img_str}"

@app.route('/')
def home():
    return jsonify({
        'message': 'Fish Classification API',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'predict': '/predict (POST)',
            'upload': '/upload (POST)'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'num_classes': len(idx_to_class) if idx_to_class else 0
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Endpoint for base64 encoded image prediction"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        image_data = data['image']
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        predictions, processed_image = predict_fish(image_bytes)
        
        processed_image_base64 = image_to_base64(processed_image)
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'top_prediction': predictions[0],
            'processed_image': processed_image_base64,
            'timestamp': request.headers.get('X-Request-Timestamp', '')
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def upload_file():
    """Endpoint for file upload prediction"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'File type not allowed. Allowed types: {ALLOWED_EXTENSIONS}'
            }), 400
        
        image_bytes = file.read()
        
        predictions, processed_image = predict_fish(image_bytes)
        
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(file_path, 'wb') as f:
            f.write(image_bytes)
        
        processed_image_base64 = image_to_base64(processed_image)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'predictions': predictions,
            'top_prediction': predictions[0],
            'processed_image': processed_image_base64
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    if model is None or idx_to_class is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    sample_classes = list(idx_to_class.values())[:10]
    
    return jsonify({
        'model_loaded': True,
        'num_classes': len(idx_to_class),
        'sample_classes': sample_classes,
        'device': str(next(model.parameters()).device)
    })

@app.route('/classes', methods=['GET'])
def get_classes():
    """Get all available fish species classes"""
    if idx_to_class is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    classes = [{'id': idx, 'name': name} for idx, name in idx_to_class.items()]
    
    return jsonify({
        'success': True,
        'classes': classes,
        'total': len(classes)
    })

if __name__ == '__main__':
    if model is None:
        print("Warning: Model failed to load. API will run but predictions will fail.")
    else:
        print(f"Model loaded successfully with {len(idx_to_class)} classes")
    
    print("Starting Flask server...")
    app.run(debug=True, host='0.0.0.0', port=5000)