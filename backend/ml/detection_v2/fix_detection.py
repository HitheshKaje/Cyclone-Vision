import json
path = r'd:\MainProjectMl\ProjectCode\backend\ml\detection_v2\create_notebook_v3.py'
with open(path, 'r') as f:
    code = f.read()

import re
old_block = r'    md\("## Step 4: Build Model OR Resume from Checkpoint"\),.*?(?=    md\("## Step 7)'

new_block = r'''    md("## Step 4: Load Existing Keras Model"),
    code([
        "OLD_MODEL_PATH = '/content/drive/MyDrive/cyclone_detector.keras'\n",
        "\n",
        "if not os.path.exists(OLD_MODEL_PATH):\n",
        "    raise FileNotFoundError(f\"COULD NOT FIND {OLD_MODEL_PATH}! Please upload your existing .keras model to Google Drive first.\")\n",
        "\n",
        "print('Loading your existing Keras model...')\n",
        "model = tf.keras.models.load_model(OLD_MODEL_PATH)\n",
        "model.summary()\n",
        "\n",
        "# Unfreeze all layers for fine-tuning\n",
        "model.trainable = True\n",
    ]),
    
    md("## Step 5: Fine-Tune Existing Model on New Dataset"),
    code([
        "# We use a very small learning rate (1e-5) so we don't destroy the knowledge the model already has!\n",
        "model.compile(\n",
        "    optimizer=optimizers.Adam(learning_rate=1e-5), \n",
        "    loss='binary_crossentropy', \n",
        "    metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]\n",
        ")\n",
        "\n",
        "callbacks_list = [\n",
        "    callbacks.EarlyStopping(monitor='val_loss', patience=4, restore_best_weights=True, verbose=1),\n",
        "    callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-7, verbose=1),\n",
        "    callbacks.ModelCheckpoint(filepath=BEST_MODEL_PATH, monitor='val_loss', save_best_only=True, verbose=1)\n",
        "]\n",
        "\n",
        "EPOCHS = 20\n",
        "print(f'Starting fine-tuning for {EPOCHS} epochs...')\n",
        "t0 = time.time()\n",
        "history = model.fit(\n",
        "    train_gen, \n",
        "    epochs=EPOCHS, \n",
        "    validation_data=val_gen, \n",
        "    callbacks=callbacks_list, \n",
        "    verbose=1\n",
        ")\n",
        "print(f'Fine-tuning complete in {(time.time()-t0)/60:.1f} min!')\n",
    ]),
'''

new_code = re.sub(old_block, new_block, code, flags=re.DOTALL)
with open(path, 'w') as f:
    f.write(new_code)
print('Updated detection notebook generator!')
