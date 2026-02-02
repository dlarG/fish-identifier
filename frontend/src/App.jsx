// src/App.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Fish,
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  X,
  BarChart3,
  Sparkles,
  Info,
  Zap,
  Shield,
  ChevronRight,
  Brain,
  Clock,
} from "lucide-react";

const API_URL = "http://localhost:5000";

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const fetchModelInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setModelInfo(data);
    } catch (err) {
      console.error("Failed to fetch model info:", err);
    }
  };

  const handleImageUpload = (file) => {
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/bmp",
      "image/gif",
      "image/webp",
    ];

    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid image file (JPEG, PNG, WebP, GIF)");
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      setError("File size too large. Maximum size is 16MB");
      return;
    }

    setError(null);
    setPredictions([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setImage(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  const handleFileInput = (event) => {
    const file = event.target.files[0];
    if (file) handleImageUpload(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Timestamp": new Date().toISOString(),
        },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Prediction failed");
      }

      if (data.success) {
        setPredictions(data.predictions);
        setSuccess(
          `Identified as ${
            data.top_prediction.species
          } with ${data.top_prediction.confidence.toFixed(2)}% confidence`
        );
      } else {
        throw new Error(data.error || "Prediction failed");
      }
    } catch (err) {
      setError(err.message || "An error occurred during prediction");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setPreview(null);
    setPredictions([]);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Fish Species AI Classifier
                </h1>
                <p className="text-sm text-gray-600">
                  Computer vision for marine biology
                </p>
              </div>
            </div>

            {modelInfo && (
              <div className="flex items-center space-x-3">
                <div className="hidden md:block text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4" />
                    <span>ResNet50 Model</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              Identify Fish Species with AI
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Upload a fish photo and our deep learning model will instantly
              identify the species from 75 different marine species with high
              accuracy.
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Upload Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Upload Image</h3>
              {preview && (
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>

            {!preview ? (
              <div
                className={`border-2 border-dashed rounded-2xl transition-all duration-200 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <div className="p-10 text-center cursor-pointer">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full mb-4">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Drag & drop fish image
                  </h4>
                  <p className="text-gray-600 mb-4">or click to browse files</p>
                  <p className="text-sm text-gray-500">
                    Supports JPG, PNG, WebP, GIF • Max 16MB
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-64 object-contain"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={triggerFileInput}
                    className="flex-1 py-3 px-4 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Change Image
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Fish className="w-4 h-4" />
                        Identify Fish
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Alerts */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Card */}
          {(predictions.length > 0 || loading) && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Analysis Results
              </h3>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-blue-100 rounded-full" />
                    <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Analyzing Image
                  </h4>
                  <p className="text-gray-600 text-center">
                    Our AI model is identifying fish species...
                  </p>
                </div>
              ) : (
                predictions.length > 0 && (
                  <>
                    {/* Top Prediction */}
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <h4 className="font-semibold text-gray-900">
                          Top Match
                        </h4>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-5 border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl font-bold text-gray-900">
                            {predictions[0].species}
                          </span>
                          <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-teal-500 text-white text-sm font-medium rounded-full">
                            {predictions[0].confidence.toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${predictions[0].confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* All Predictions */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <BarChart3 className="w-5 h-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">
                          All Predictions
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {predictions.slice(1).map((pred, index) => (
                          <div
                            key={pred.class_id}
                            className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-medium text-gray-700">
                                #{index + 2}
                              </div>
                              <span className="font-medium text-gray-900">
                                {pred.species}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-400 to-teal-400 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${pred.confidence}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                                {pred.confidence.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              )}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              How It Works
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our AI-powered system uses advanced computer vision to accurately
              identify fish species
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Upload className="w-6 h-6" />,
                title: "Upload Image",
                description:
                  "Upload a clear photo of a fish. The system supports various image formats and sizes.",
                color: "blue",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "AI Analysis",
                description:
                  "Our ResNet50 model processes the image through multiple neural network layers.",
                color: "teal",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Get Results",
                description:
                  "Receive instant predictions with confidence scores for multiple species.",
                color: "purple",
              },
            ].map((step, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div
                  className={`inline-flex p-3 bg-${step.color}-50 rounded-xl mb-4`}
                >
                  <div className={`text-${step.color}-600`}>{step.icon}</div>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h4>
                <p className="text-gray-600">{step.description}</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="inline-flex items-center text-sm font-medium text-blue-600">
                    Learn more <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl p-8 text-white mb-10">
          <div className="text-center mb-8">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl font-bold mb-3">
              Why Choose Our Classifier
            </h3>
            <p className="opacity-90 max-w-2xl mx-auto">
              Advanced features for accurate and reliable fish species
              identification
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "High Accuracy",
                desc: "Trained on 75+ species with >95% accuracy",
              },
              {
                title: "Fast Processing",
                desc: "Instant results in under 2 seconds",
              },
              {
                title: "Scientific Model",
                desc: "Based on ResNet50 deep learning architecture",
              },
              {
                title: "User Friendly",
                desc: "Simple drag & drop interface for everyone",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-5"
              >
                <div className="text-lg font-semibold mb-2">
                  {feature.title}
                </div>
                <div className="text-sm opacity-90">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Fish className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-900">
                Fish Species AI Classifier
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Powered by PyTorch & ResNet50 • Trained on 75 fish species
            </p>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Marine AI Research • For educational
              purposes only
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
