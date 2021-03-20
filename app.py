import os
import sys
from PIL import Image
import io
import cv2 as cv
import numpy as np
# Flask
from flask import Flask, redirect, url_for, request, render_template, Response, jsonify, redirect, send_file
# Some utilites
from util import base64_to_pil


# Declare a flask app
app = Flask(__name__)


def find_nearest_white(img, target):
    open_cv_image = np.array(img)
    open_cv_image = cv.cvtColor(open_cv_image, cv.COLOR_BGR2GRAY)
    nonzero = cv.findNonZero(open_cv_image)
    distances = np.sqrt((nonzero[:,:,0] - target[0]) ** 2 + (nonzero[:,:,1] - target[1]) ** 2)
    nearest_index = np.argmin(distances)
    return nonzero[nearest_index][0], np.min(distances)

def model_predict(img):
    #print(img)
    open_cv_image = np.array(img)
    
    arr = cv.Canny(open_cv_image, 100, 200)

    # convert numpy array to PIL Image
    img = Image.fromarray(arr.astype('uint8'))

    # create file-object in memory
    file_object = io.BytesIO()

    # write PNG in file-object
    img.save(file_object, 'PNG')

    # move to beginning of file so `send_file()` it will read from start
    file_object.seek(0)

    return send_file(file_object, mimetype='image/PNG')


@app.route('/', methods=['GET'])
def index():
    # Main page
    return render_template('index.html')

@app.route('/findEdge', methods=["POST"])
def findEdge():
    img = base64_to_pil(request.form['image'])
    target = np.array([request.form['x'],request.form['y']], dtype=float)
    nearestPoint, distance = find_nearest_white(img, target)
    result = {'x' : int(nearestPoint[0]), 'y' : int(nearestPoint[1]), 'distance': float(distance)}
    return jsonify(result)

@app.route('/predict', methods=['GET', 'POST'])
def predict():
    if request.method == 'POST':
        # Get the image from post request
        img = base64_to_pil(request.json)
        # Make prediction
        return model_predict(img)

    return None

if __name__ == "__main__":
    app.run()
