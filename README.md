# CycloneVision: AI-Driven Tropical Cyclone Detection

This repository implements Objective 1 of CycloneVision: A binary classification model (Cyclone vs. No Cyclone) based on satellite imagery.

## Dataset Limitations

> **Note**: The original dataset containing Cyclone and No_Cyclone images was not provided. The model scripts are prepared, but training cannot occur until the dataset is placed in `backend/ml/dataset/`.

Expected dataset structure:
```
backend/ml/dataset/
  Cyclone/
    img1.jpg...
  No_Cyclone/
    img1.jpg...
```

## Architecture

- **Backend**: Python, FastAPI, TensorFlow/Keras, OpenCV.
- **Model**: Transfer learning utilizing `EfficientNetB0` pretrained on ImageNet. The final classification layer is modified for binary classification.
- **Frontend**: React, Vite, Tailwind CSS.

## Preprocessing & Augmentation

- Images are resized to `224x224`.
- Extraneous channels are converted from BGR (OpenCV) to RGB.
- Data augmentation (horizontal flip, small rotation, zoom, translation) is applied dynamically during training to the training set **only**.

## Setup & Running

### 1. Backend Setup

Open a terminal in the `backend` directory:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Train the Model

Ensure the dataset is populated, then run:

```bash
cd ml
python train_detection.py --epochs 20 --batch_size 32
```
This will save the best model to `models/cyclone_detector.keras`.

### 3. Evaluate the Model

```bash
cd ml
python evaluate_detection.py
```
This will output metrics (Accuracy, Precision, Recall, F1) to `outputs/metrics/`.

### 4. Start FastAPI Server

```bash
cd app
python main.py
```
The API will run on `http://localhost:8000/api/detect`.

### 5. Start React Frontend

Open a new terminal in the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on your local dev server (e.g. `http://localhost:5173`). Upload an image via the dashboard to test the prediction pipeline.
