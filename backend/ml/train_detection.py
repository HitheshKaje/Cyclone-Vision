import os
import json
import argparse
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from preprocessing import prepare_data

def build_model(input_shape=(224, 224, 3)):
    # Load pretrained EfficientNetB0, applying its specific preprocessing internally 
    # when passed inputs, or we can use the preprocessing layer.
    base_model = EfficientNetB0(weights='imagenet', include_top=False, input_shape=input_shape)
    
    # Freeze the base model layers
    base_model.trainable = False
    
    # Add classification head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.2)(x)
    predictions = Dense(1, activation='sigmoid')(x)
    
    model = Model(inputs=base_model.input, outputs=predictions)
    return model

def plot_history(history, save_path):
    acc = history.history['accuracy']
    val_acc = history.history['val_accuracy']
    loss = history.history['loss']
    val_loss = history.history['val_loss']
    
    epochs = range(1, len(acc) + 1)
    
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(epochs, acc, 'b', label='Training acc')
    plt.plot(epochs, val_acc, 'r', label='Validation acc')
    plt.title('Training and Validation Accuracy')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(epochs, loss, 'b', label='Training loss')
    plt.plot(epochs, val_loss, 'r', label='Validation loss')
    plt.title('Training and Validation Loss')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()

def main():
    parser = argparse.ArgumentParser(description='Train Cyclone Detection Model')
    parser.add_argument('--dataset', type=str, default='dataset', help='Path to dataset directory')
    parser.add_argument('--epochs', type=int, default=20, help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    args = parser.parse_args()
    
    dataset_dir = args.dataset
    if not os.path.exists(dataset_dir):
        print(f"Error: Dataset directory '{dataset_dir}' not found.")
        return
        
    print("Preparing data...")
    (X_train, y_train), (X_val, y_val), (X_test, y_test), classes = prepare_data(dataset_dir)
        
    os.makedirs('../models', exist_ok=True)
    with open('../models/class_names.json', 'w') as f:
        json.dump(classes, f)
        
    print("Building model...")
    model = build_model()
    
    # Data Augmentation (Training ONLY)
    data_augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal_and_vertical"),
        tf.keras.layers.RandomRotation(0.2),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomTranslation(0.1, 0.1),
    ])
    
    # EfficientNet preprocessing is applied inside the model automatically or we can add it explicitly
    # Keras EfficientNetB0 expects inputs in [0, 255] and handles normalization internally.
    inputs = tf.keras.Input(shape=(224, 224, 3))
    x = data_augmentation(inputs)
    outputs = model(x)
    train_model = Model(inputs, outputs)
    
    train_model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(name='precision'), tf.keras.metrics.Recall(name='recall')]
    )
    
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
    
    os.makedirs('../outputs/metrics', exist_ok=True)
    plot_history(history, '../outputs/metrics/training_history.png')
    
    print("Training complete. Model saved to '../models/cyclone_detector.keras'")

if __name__ == '__main__':
    main()
