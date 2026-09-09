import os
import json
import argparse
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from preprocessing import prepare_data

def build_model(input_shape=(224, 224, 3)):
    # Load pretrained EfficientNetB0
    base_model = EfficientNetB0(weights='imagenet', include_top=False, input_shape=input_shape)
    
    # Freeze the base model layers
    base_model.trainable = False
    
    # Add classification head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.2)(x)
    # Output layer for binary classification
    # We use a single unit with sigmoid activation (0: No Cyclone, 1: Cyclone)
    predictions = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    
    # Compile the model
    model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(name='precision'), tf.keras.metrics.Recall(name='recall')]
    )
    
    return model

def main():
    parser = argparse.ArgumentParser(description='Train Cyclone Detection Model')
    parser.add_argument('--dataset', type=str, default='dataset', help='Path to dataset directory')
    parser.add_argument('--epochs', type=int, default=20, help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    args = parser.parse_args()
    
    dataset_dir = args.dataset
    if not os.path.exists(dataset_dir):
        print(f"Error: Dataset directory '{dataset_dir}' not found.")
        print("Please place the dataset inside the 'backend/ml/dataset' folder.")
        return
        
    print("Preparing data...")
    try:
        (X_train, y_train), (X_val, y_val), (X_test, y_test), classes = prepare_data(dataset_dir)
    except ValueError as e:
        print(e)
        return
        
    # Save class names
    os.makedirs('../models', exist_ok=True)
    with open('../models/class_names.json', 'w') as f:
        json.dump(classes, f)
        
    print("Building model...")
    model = build_model()
    
    # Data Augmentation for training only
    data_augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal_and_vertical"),
        tf.keras.layers.RandomRotation(0.2),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomTranslation(0.1, 0.1),
    ])
    
    # Combine augmentation and model
    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = data_augmentation(inputs)
    outputs = model(x)
    train_model = Model(inputs, outputs)
    
    train_model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(name='precision'), tf.keras.metrics.Recall(name='recall')]
    )
    
    # Callbacks
    checkpoint = ModelCheckpoint(
        '../models/cyclone_detector.keras', 
        monitor='val_loss', 
        save_best_only=True, 
        mode='min',
        verbose=1
    )
    early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=1e-6)
    
    print("Starting training...")
    history = train_model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=[checkpoint, early_stop, reduce_lr]
    )
    
    # Save training history
    os.makedirs('../outputs/metrics', exist_ok=True)
    with open('../outputs/metrics/training_history.json', 'w') as f:
        # Convert float32 to float for JSON serialization
        hist_dict = {k: [float(val) for val in v] for k, v in history.history.items()}
        json.dump(hist_dict, f)
        
    print("Training complete. Model saved to '../models/cyclone_detector.keras'")

if __name__ == '__main__':
    main()
